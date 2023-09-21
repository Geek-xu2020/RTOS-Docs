import{_ as p,r as a,o,c,a as s,b as n,d as t,w as l,e as u}from"./app-772064a0.js";const d={},r=u(`<h1 id="第八章-事件组-event-group" tabindex="-1"><a class="header-anchor" href="#第八章-事件组-event-group" aria-hidden="true">#</a> 第八章 事件组(event group)</h1><p>学校组织秋游，组长在等待：</p><ul><li>张三：我到了</li><li>李四：我到了</li><li>王五：我到了</li><li>组长说：好，大家都到齐了，出发！</li></ul><p>秋游回来第二天就要提交一篇心得报告，组长在焦急等待：张三、李四、王五谁先写好就交谁的。</p><p>在这个日常生活场景中：</p><ul><li>出发：要等待这3个人都到齐，他们是&quot;与&quot;的关系</li><li>交报告：只需等待这3人中的任何一个，他们是&quot;或&quot;的关系</li></ul><p>在FreeRTOS中，可以使用事件组(event group)来解决这些问题。</p><p>本章涉及如下内容：</p><ul><li>事件组的概念与操作函数</li><li>事件组的优缺点</li><li>怎么设置、等待、清除事件组中的位</li><li>使用事件组来同步多个任务</li></ul><h2 id="_8-1-事件组概念与操作" tabindex="-1"><a class="header-anchor" href="#_8-1-事件组概念与操作" aria-hidden="true">#</a> 8.1 事件组概念与操作</h2><h3 id="_8-1-1-事件组的概念" tabindex="-1"><a class="header-anchor" href="#_8-1-1-事件组的概念" aria-hidden="true">#</a> 8.1.1 事件组的概念</h3><p>事件组可以简单地认为就是一个整数：</p><ul><li>的每一位表示一个事件</li><li>每一位事件的含义由程序员决定，比如：Bit0表示用来串口是否就绪，Bit1表示按键是否被按下</li><li>这些位，值为1表示事件发生了，值为0表示事件没发生</li><li>一个或多个任务、ISR都可以去写这些位；一个或多个任务、ISR都可以去读这些位</li><li>可以等待某一位、某些位中的任意一个，也可以等待多位</li></ul><p><img src="http://photos.100ask.net/rtos-docs/freeRTOS/simulator/chapter-8/01_event_group.png" alt="image-20210807120827516"></p><p>事件组用一个整数来表示，其中的高8位留给内核使用，只能用其他的位来表示事件。那么这个整数是多少位的？</p><ul><li>如果configUSE_16_BIT_TICKS是1，那么这个整数就是16位的，低8位用来表示事件</li><li>如果configUSE_16_BIT_TICKS是0，那么这个整数就是32位的，低24位用来表示事件</li><li>configUSE_16_BIT_TICKS是用来表示Tick Count的，怎么会影响事件组？这只是基于效率来考虑 <ul><li>如果configUSE_16_BIT_TICKS是1，就表示该处理器使用16位更高效，所以事件组也使用16位</li><li>如果configUSE_16_BIT_TICKS是0，就表示该处理器使用32位更高效，所以事件组也使用32位</li></ul></li></ul><h3 id="_8-1-2-事件组的操作" tabindex="-1"><a class="header-anchor" href="#_8-1-2-事件组的操作" aria-hidden="true">#</a> 8.1.2 事件组的操作</h3><p>事件组和队列、信号量等不太一样，主要集中在2个地方：</p><ul><li>唤醒谁？ <ul><li>队列、信号量：事件发生时，只会唤醒一个任务</li><li>事件组：事件发生时，会唤醒所有符号条件的任务，简单地说它有&quot;广播&quot;的作用</li></ul></li><li>是否清除事件？ <ul><li>队列、信号量：是消耗型的资源，队列的数据被读走就没了；信号量被获取后就减少了</li><li>事件组：被唤醒的任务有两个选择，可以让事件保留不动，也可以清除事件</li></ul></li></ul><p>以上图为列，事件组的常规操作如下：</p><ul><li><p>先创建事件组</p></li><li><p>任务C、D等待事件：</p><ul><li>等待什么事件？可以等待某一位、某些位中的任意一个，也可以等待多位。简单地说就是&quot;或&quot;、&quot;与&quot;的关系。</li><li>得到事件时，要不要清除？可选择清除、不清除。</li></ul></li><li><p>任务A、B产生事件：设置事件组里的某一位、某些位</p></li></ul><h2 id="_8-2-事件组函数" tabindex="-1"><a class="header-anchor" href="#_8-2-事件组函数" aria-hidden="true">#</a> 8.2 事件组函数</h2><h3 id="_8-2-1-创建" tabindex="-1"><a class="header-anchor" href="#_8-2-1-创建" aria-hidden="true">#</a> 8.2.1 创建</h3><p>使用事件组之前，要先创建，得到一个句柄；使用事件组时，要使用句柄来表明使用哪个事件组。</p><p>有两种创建方法：动态分配内存、静态分配内存。函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 创建一个事件组，返回它的句柄。
 * 此函数内部会分配事件组结构体 
 * 返回值: 返回句柄，非NULL表示成功
 */</span>
EventGroupHandle_t <span class="token function">xEventGroupCreate</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">/* 创建一个事件组，返回它的句柄。
 * 此函数无需动态分配内存，所以需要先有一个StaticEventGroup_t结构体，并传入它的指针
 * 返回值: 返回句柄，非NULL表示成功
 */</span>
EventGroupHandle_t <span class="token function">xEventGroupCreateStatic</span><span class="token punctuation">(</span> StaticEventGroup_t <span class="token operator">*</span> pxEventGroupBuffer <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_8-2-2-删除" tabindex="-1"><a class="header-anchor" href="#_8-2-2-删除" aria-hidden="true">#</a> 8.2.2 删除</h3><p>对于动态创建的事件组，不再需要它们时，可以删除它们以回收内存。</p><p>vEventGroupDelete可以用来删除事件组，函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/*
 * xEventGroup: 事件组句柄，你要删除哪个事件组
 */</span>
<span class="token keyword">void</span> <span class="token function">vEventGroupDelete</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup <span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_8-2-3-设置事件" tabindex="-1"><a class="header-anchor" href="#_8-2-3-设置事件" aria-hidden="true">#</a> 8.2.3 设置事件</h3><p>可以设置事件组的某个位、某些位，使用的函数有2个：</p><ul><li>在任务中使用<code>xEventGroupSetBits()</code></li><li>在ISR中使用<code>xEventGroupSetBitsFromISR()</code></li></ul><p>有一个或多个任务在等待事件，如果这些事件符合这些任务的期望，那么任务还会被唤醒。</p><p>函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 设置事件组中的位
 * xEventGroup: 哪个事件组
 * uxBitsToSet: 设置哪些位? 
 *              如果uxBitsToSet的bitX, bitY为1, 那么事件组中的bitX, bitY被设置为1
 *               可以用来设置多个位，比如 0x15 就表示设置bit4, bit2, bit0
 * 返回值: 返回原来的事件值(没什么意义, 因为很可能已经被其他任务修改了)
 */</span>
EventBits_t <span class="token function">xEventGroupSetBits</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
                                    <span class="token keyword">const</span> EventBits_t uxBitsToSet <span class="token punctuation">)</span><span class="token punctuation">;</span>


<span class="token comment">/* 设置事件组中的位
 * xEventGroup: 哪个事件组
 * uxBitsToSet: 设置哪些位? 
 *              如果uxBitsToSet的bitX, bitY为1, 那么事件组中的bitX, bitY被设置为1
 *               可以用来设置多个位，比如 0x15 就表示设置bit4, bit2, bit0
 * pxHigherPriorityTaskWoken: 有没有导致更高优先级的任务进入就绪态? pdTRUE-有, pdFALSE-没有
 * 返回值: pdPASS-成功, pdFALSE-失败
 */</span>
BaseType_t <span class="token function">xEventGroupSetBitsFromISR</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
									  <span class="token keyword">const</span> EventBits_t uxBitsToSet<span class="token punctuation">,</span>
									  BaseType_t <span class="token operator">*</span> pxHigherPriorityTaskWoken <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>值得注意的是，ISR中的函数，比如队列函数<code>xQueueSendToBackFromISR</code>、信号量函数<code>xSemaphoreGiveFromISR</code>，它们会唤醒某个任务，最多只会唤醒1个任务。</p><p>但是设置事件组时，有可能导致多个任务被唤醒，这会带来很大的不确定性。所以<code>xEventGroupSetBitsFromISR</code>函数不是直接去设置事件组，而是给一个FreeRTOS后台任务(daemon task)发送队列数据，由这个任务来设置事件组。</p><p>如果后台任务的优先级比当前被中断的任务优先级高，<code>xEventGroupSetBitsFromISR</code>会设置<code>*pxHigherPriorityTaskWoken</code>为pdTRUE。</p><p>如果daemon task成功地把队列数据发送给了后台任务，那么<code>xEventGroupSetBitsFromISR</code>的返回值就是pdPASS。</p><h3 id="_8-2-4-等待事件" tabindex="-1"><a class="header-anchor" href="#_8-2-4-等待事件" aria-hidden="true">#</a> 8.2.4 等待事件</h3><p>使用<code>xEventGroupWaitBits</code>来等待事件，可以等待某一位、某些位中的任意一个，也可以等待多位；等到期望的事件后，还可以清除某些位。</p><p>函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>EventBits_t <span class="token function">xEventGroupWaitBits</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> EventBits_t uxBitsToWaitFor<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> BaseType_t xClearOnExit<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> BaseType_t xWaitForAllBits<span class="token punctuation">,</span>
                                 TickType_t xTicksToWait <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>先引入一个概念：unblock condition。一个任务在等待事件发生时，它处于阻塞状态；当期望的时间发生时，这个状态就叫&quot;unblock condition&quot;，非阻塞条件，或称为&quot;非阻塞条件成立&quot;；当&quot;非阻塞条件成立&quot;后，该任务就可以变为就绪态。</p><p>函数参数说明列表如下：</p><table><thead><tr><th>参数</th><th>说明</th></tr></thead><tbody><tr><td>xEventGroup</td><td>等待哪个事件组？</td></tr><tr><td>uxBitsToWaitFor</td><td>等待哪些位？哪些位要被测试？</td></tr><tr><td>xWaitForAllBits</td><td>怎么测试？是&quot;AND&quot;还是&quot;OR&quot;？<br>pdTRUE: 等待的位，全部为1;<br>pdFALSE: 等待的位，某一个为1即可</td></tr><tr><td>xClearOnExit</td><td>函数提出前是否要清除事件？<br>pdTRUE: 清除uxBitsToWaitFor指定的位<br>pdFALSE: 不清除</td></tr><tr><td>xTicksToWait</td><td>如果期待的事件未发生，阻塞多久。<br>可以设置为0：判断后即刻返回；<br>可设置为portMAX_DELAY：一定等到成功才返回；<br>可以设置为期望的Tick Count，一般用<code>pdMS_TO_TICKS()</code>把ms转换为Tick Count</td></tr><tr><td>返回值</td><td>返回的是事件值，<br>如果期待的事件发生了，返回的是&quot;非阻塞条件成立&quot;时的事件值；<br>如果是超时退出，返回的是超时时刻的事件值。</td></tr></tbody></table><p>举例如下：</p><table><thead><tr><th>事件组的值</th><th>uxBitsToWaitFor</th><th>xWaitForAllBits</th><th>说明</th></tr></thead><tbody><tr><td>0100</td><td>0101</td><td>pdTRUE</td><td>任务期望bit0,bit2都为1，<br>当前值只有bit2满足，任务进入阻塞态；<br>当事件组中bit0,bit2都为1时退出阻塞态</td></tr><tr><td>0100</td><td>0110</td><td>pdFALSE</td><td>任务期望bit0,bit2某一个为1，<br>当前值满足，所以任务成功退出</td></tr><tr><td>0100</td><td>0110</td><td>pdTRUE</td><td>任务期望bit1,bit2都为1，<br>当前值不满足，任务进入阻塞态；<br>当事件组中bit1,bit2都为1时退出阻塞态</td></tr></tbody></table><p>你可以使用<code>xEventGroupWaitBits()</code>等待期望的事件，它发生之后再使用<code>xEventGroupClearBits()</code>来清除。但是这两个函数之间，有可能被其他任务或中断抢占，它们可能会修改事件组。</p><p>可以使用设置<code>xClearOnExit</code>为pdTRUE，使得对事件组的测试、清零都在<code>xEventGroupWaitBits()</code>函数内部完成，这是一个原子操作。</p><h3 id="_8-2-5-同步点" tabindex="-1"><a class="header-anchor" href="#_8-2-5-同步点" aria-hidden="true">#</a> 8.2.5 同步点</h3><p>有一个事情需要多个任务协同，比如：</p><ul><li>任务A：炒菜</li><li>任务B：买酒</li><li>任务C：摆台</li><li>A、B、C做好自己的事后，还要等别人做完；大家一起做完，才可开饭</li></ul><p>使用<code>xEventGroupSync()</code>函数可以同步多个任务：</p><ul><li>可以设置某位、某些位，表示自己做了什么事</li><li>可以等待某位、某些位，表示要等等其他任务</li><li>期望的时间发生后，<code>xEventGroupSync()</code>才会成功返回。</li><li><code>xEventGroupSync</code>成功返回后，会清除事件</li></ul><p><code>xEventGroupSync</code>函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>EventBits_t <span class="token function">xEventGroupSync</span><span class="token punctuation">(</span>    EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
                                <span class="token keyword">const</span> EventBits_t uxBitsToSet<span class="token punctuation">,</span>
                                <span class="token keyword">const</span> EventBits_t uxBitsToWaitFor<span class="token punctuation">,</span>
                                TickType_t xTicksToWait <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>参数列表如下：</p><table><thead><tr><th>参数</th><th>说明</th></tr></thead><tbody><tr><td>xEventGroup</td><td>哪个事件组？</td></tr><tr><td>uxBitsToSet</td><td>要设置哪些事件？我完成了哪些事件？<br>比如0x05(二进制为0101)会导致事件组的bit0,bit2被设置为1</td></tr><tr><td>uxBitsToWaitFor</td><td>等待那个位、哪些位？<br>比如0x15(二级制10101)，表示要等待bit0,bit2,bit4都为1</td></tr><tr><td>xTicksToWait</td><td>如果期待的事件未发生，阻塞多久。<br>可以设置为0：判断后即刻返回；<br>可设置为portMAX_DELAY：一定等到成功才返回；<br>可以设置为期望的Tick Count，一般用<code>pdMS_TO_TICKS()</code>把ms转换为Tick Count</td></tr><tr><td>返回值</td><td>返回的是事件值，<br>如果期待的事件发生了，返回的是&quot;非阻塞条件成立&quot;时的事件值；<br>如果是超时退出，返回的是超时时刻的事件值。</td></tr></tbody></table><h2 id="_8-3-示例20-等待多个事件" tabindex="-1"><a class="header-anchor" href="#_8-3-示例20-等待多个事件" aria-hidden="true">#</a> 8.3 示例20: 等待多个事件</h2><p>本节源码是<code>FreeRTOS_20_event_group_wait_multi_events</code>。</p><p>要使用事件组，代码中要有如下操作：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 1. 工程中添加event_groups.c */</span>

<span class="token comment">/* 2. 源码中包含头文件 */</span>
<span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">include</span> <span class="token string">&quot;event_groups.h&quot;</span></span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>假设大厨要等手下做完这些事才可以炒菜：洗菜、生火。</p><p>本程序创建3个任务：</p><ul><li>任务1：洗菜</li><li>任务2：生火</li><li>任务3：炒菜。</li></ul><p>main函数代码如下，它创建了3个任务：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	<span class="token function">prvSetupHardware</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	
    <span class="token comment">/* 创建递归锁 */</span>
    xEventGroup <span class="token operator">=</span> <span class="token function">xEventGroupCreate</span><span class="token punctuation">(</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

	<span class="token keyword">if</span><span class="token punctuation">(</span> xEventGroup <span class="token operator">!=</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span>
	<span class="token punctuation">{</span>
		<span class="token comment">/* 创建3个任务: 洗菜/生火/炒菜
		 */</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vWashingTask<span class="token punctuation">,</span> <span class="token string">&quot;Task1&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token constant">NULL</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vFiringTask<span class="token punctuation">,</span>  <span class="token string">&quot;Task2&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token constant">NULL</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vCookingTask<span class="token punctuation">,</span> <span class="token string">&quot;Task3&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token constant">NULL</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

		<span class="token comment">/* 启动调度器 */</span>
		<span class="token function">vTaskStartScheduler</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
	<span class="token keyword">else</span>
	<span class="token punctuation">{</span>
		<span class="token comment">/* 无法创建事件组 */</span>
	<span class="token punctuation">}</span>

	<span class="token comment">/* 如果程序运行到了这里就表示出错了, 一般是内存不足 */</span>
	<span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这3个任务的代码和执行流程如下：</p><ul><li>A：&quot;炒菜任务&quot;优先级最高，先执行。它要等待的2个事件未发生：洗菜、生火，进入阻塞状态</li><li>B：&quot;生火任务&quot;接着执行，它要等待的1个事件未发生：洗菜，进入阻塞状态</li><li>C：&quot;洗菜任务&quot;接着执行，它洗好菜，发出事件：洗菜，然后调用F等待&quot;炒菜&quot;事件</li><li>D：&quot;生火任务&quot;等待的事件满足了，从B处继续执行，开始生火、发出&quot;生火&quot;事件</li><li>E：&quot;炒菜任务&quot;等待的事件满足了，从A出继续执行，开始炒菜、发出&quot;炒菜&quot;事件</li><li>F：&quot;洗菜任务&quot;等待的事件满足了，退出F、继续执行C</li></ul><p>要注意的是，代码B处等待到&quot;洗菜任务&quot;后并不清除该事件，如果清除的话会导致&quot;炒菜任务&quot;无法执行。</p><p><img src="http://photos.100ask.net/rtos-docs/freeRTOS/simulator/chapter-8/02_multi_events.png" alt="image-20210809093406670"></p><p>运行结果如下图所示：</p><p><img src="http://photos.100ask.net/rtos-docs/freeRTOS/simulator/chapter-8/03_multi_events_result.png" alt="image-20210809092848723"></p><h2 id="_8-3-示例21-任务同步" tabindex="-1"><a class="header-anchor" href="#_8-3-示例21-任务同步" aria-hidden="true">#</a> 8.3 示例21: 任务同步</h2><p>本节代码是<code>FreeRTOS_21_event_group_task_sync</code>。</p><p>假设ABC三人要吃饭，各司其职：</p><ul><li>A：炒菜</li><li>B：买酒</li><li>C：摆台</li></ul><p>三人都做完后，才可以开饭。</p><p>main函数代码如下，它创建了3个任务：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	<span class="token function">prvSetupHardware</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	
    <span class="token comment">/* 创建递归锁 */</span>
    xEventGroup <span class="token operator">=</span> <span class="token function">xEventGroupCreate</span><span class="token punctuation">(</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

	<span class="token keyword">if</span><span class="token punctuation">(</span> xEventGroup <span class="token operator">!=</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span>
	<span class="token punctuation">{</span>
		<span class="token comment">/* 创建3个任务: 洗菜/生火/炒菜
		 */</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vCookingTask<span class="token punctuation">,</span> <span class="token string">&quot;task1&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token string">&quot;A&quot;</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vBuyingTask<span class="token punctuation">,</span>  <span class="token string">&quot;task2&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token string">&quot;B&quot;</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">xTaskCreate</span><span class="token punctuation">(</span> vTableTask<span class="token punctuation">,</span>   <span class="token string">&quot;task3&quot;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">,</span> <span class="token string">&quot;C&quot;</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

		<span class="token comment">/* 启动调度器 */</span>
		<span class="token function">vTaskStartScheduler</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
	<span class="token keyword">else</span>
	<span class="token punctuation">{</span>
		<span class="token comment">/* 无法创建事件组 */</span>
	<span class="token punctuation">}</span>

	<span class="token comment">/* 如果程序运行到了这里就表示出错了, 一般是内存不足 */</span>
	<span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>被创建的3个任务，代码都很类似，以任务1为例：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">vCookingTask</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token operator">*</span>pvParameters <span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	<span class="token keyword">const</span> TickType_t xTicksToWait <span class="token operator">=</span> <span class="token function">pdMS_TO_TICKS</span><span class="token punctuation">(</span> <span class="token number">100UL</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>		
	<span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
	
	<span class="token comment">/* 无限循环 */</span>
	<span class="token keyword">for</span><span class="token punctuation">(</span> <span class="token punctuation">;</span><span class="token punctuation">;</span> <span class="token punctuation">)</span>
	<span class="token punctuation">{</span>
        <span class="token comment">/* 做自己的事 */</span>
		<span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;%s is cooking %d time....\\r\\n&quot;</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token keyword">char</span> <span class="token operator">*</span><span class="token punctuation">)</span>pvParameters<span class="token punctuation">,</span> i<span class="token punctuation">)</span><span class="token punctuation">;</span>
		
		<span class="token comment">/* 表示我做好了, 还要等别人都做好 */</span>
		<span class="token function">xEventGroupSync</span><span class="token punctuation">(</span>xEventGroup<span class="token punctuation">,</span> COOKING<span class="token punctuation">,</span> ALL<span class="token punctuation">,</span> portMAX_DELAY<span class="token punctuation">)</span><span class="token punctuation">;</span>
	
		<span class="token comment">/* 别人也做好了, 开饭 */</span>
		<span class="token function">printf</span><span class="token punctuation">(</span><span class="token string">&quot;%s is eating %d time....\\r\\n&quot;</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token keyword">char</span> <span class="token operator">*</span><span class="token punctuation">)</span>pvParameters<span class="token punctuation">,</span> i<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">vTaskDelay</span><span class="token punctuation">(</span>xTicksToWait<span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>要点在于<code>xEventGroupSync</code>函数，它有3个功能：</p><ul><li>设置事件：表示自己完成了某个、某些事件</li><li>等待事件：跟别的任务同步</li><li>成功返回后，清除&quot;等待的事件&quot;</li></ul><p>运行结果如下图所示：</p><p><img src="http://photos.100ask.net/rtos-docs/freeRTOS/simulator/chapter-8/04_running_results.jpg" alt="image-20210809100540110"></p><h2 id="技术答疑交流" tabindex="-1"><a class="header-anchor" href="#技术答疑交流" aria-hidden="true">#</a> 技术答疑交流</h2>`,89),v={href:"https://forums.100ask.net",target:"_blank",rel:"noopener noreferrer"},k=s("hr",null,null,-1);function m(b,h){const e=a("ExternalLinkIcon"),i=a("center");return o(),c("div",null,[r,s("p",null,[n("在学习中遇到任何问题，请前往我们的技术交流社区留言： "),s("a",v,[n("https://forums.100ask.net"),t(e)])]),k,t(i,null,{default:l(()=>[n("本章完")]),_:1})])}const x=p(d,[["render",m],["__file","chapter8.html.vue"]]);export{x as default};
