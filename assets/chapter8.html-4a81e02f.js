import{_ as p,r as t,o as i,c as l,a as n,b as a,d as o,e as s}from"./app-772064a0.js";const c={},r=s('<h1 id="第8章-内存管理" tabindex="-1"><a class="header-anchor" href="#第8章-内存管理" aria-hidden="true">#</a> 第8章 内存管理</h1><h2 id="_8-1-为什么要自己实现内存管理" tabindex="-1"><a class="header-anchor" href="#_8-1-为什么要自己实现内存管理" aria-hidden="true">#</a> 8.1 为什么要自己实现内存管理</h2><p>后续的章节涉及这些内核对象：task、queue、semaphores和event group等。为了让FreeRTOS更容易使用，这些内核对象一般都是动态分配：用到时分配，不使用时释放。使用内存的动态管理功能，简化了程序设计：不再需要小心翼翼地提前规划各类对象，简化API函数的涉及，甚至可以减少内存的使用。</p><p>内存的动态管理是C程序的知识范畴，并不属于FreeRTOS的知识范畴，但是它跟FreeRTOS关系是如此紧密，所以我们先讲解它。</p><p>在C语言的库函数中，有mallc、free等函数，但是在FreeRTOS中，它们不适用：</p><ul><li>不适合用在资源紧缺的嵌入式系统中</li><li>这些函数的实现过于复杂、占据的代码空间太大</li><li>并非线程安全的(thread- safe)</li><li>运行有不确定性：每次调用这些函数时花费的时间可能都不相同</li><li>内存碎片化</li><li>使用不同的编译器时，需要进行复杂的配置</li><li>有时候难以调试</li></ul><p>注意：我们经常&quot;堆栈&quot;混合着说，其实它们不是同一个东西：</p><ul><li>堆，heap，就是一块空闲的内存，需要提供管理函数 <ul><li>malloc：从堆里划出一块空间给程序使用</li><li>free：用完后，再把它标记为&quot;空闲&quot;的，可以再次使用</li></ul></li><li>栈，stack，函数调用时局部变量保存在栈中，当前程序的环境也是保存在栈中 <ul><li>可以从堆中分配一块空间用作栈</li></ul></li></ul><img src="http://photos.100ask.net/rtos-docs/freeRTOS/DShanMCU-F103/chapter-8/image1.png" style="zoom:33%;"><h2 id="_8-2-freertos的5中内存管理方法" tabindex="-1"><a class="header-anchor" href="#_8-2-freertos的5中内存管理方法" aria-hidden="true">#</a> 8.2 FreeRTOS的5中内存管理方法</h2><p>FreeRTOS中内存管理的接口函数为：pvPortMalloc 、vPortFree，对应于C库的malloc、free。 文件在FreeRTOS/Source/portable/MemMang下，它也是放在portable目录下，表示你可以提供自己的函数。</p><p>源码中默认提供了5个文件，对应内存管理的5种方法。</p>',12),u={href:"https://blog.csdn.net/qq_43212092/article/details/104845158",target:"_blank",rel:"noopener noreferrer"},d=s(`<img src="http://photos.100ask.net/rtos-docs/freeRTOS/DShanMCU-F103/chapter-8/image2.jpg" alt="image2" style="zoom:67%;"><h3 id="_8-2-1-heap-1" tabindex="-1"><a class="header-anchor" href="#_8-2-1-heap-1" aria-hidden="true">#</a> 8.2.1 Heap_1</h3><p>它只实现了pvPortMalloc，没有实现vPortFree。</p><p>如果你的程序不需要删除内核对象，那么可以使用heap_1：</p><ul><li>实现最简单</li><li>没有碎片问题</li><li>一些要求非常严格的系统里，不允许使用动态内存，就可以使用heap_1</li></ul><p>它的实现原理很简单，首先定义一个大数组：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* Allocate the memory for the heap. */</span>
##<span class="token keyword">if</span> <span class="token punctuation">(</span> configAPPLICATION_ALLOCATED_HEAP <span class="token operator">==</span> <span class="token number">1</span> <span class="token punctuation">)</span>

<span class="token comment">/* The application writer has already defined the array used for the RTOS
* heap -  probably so it can be placed in a special segment or address. */</span>
    <span class="token keyword">extern</span> <span class="token class-name">uint8_t</span> ucHeap<span class="token punctuation">[</span> configTOTAL_HEAP_SIZE <span class="token punctuation">]</span><span class="token punctuation">;</span>
##<span class="token keyword">else</span>
    <span class="token keyword">static</span> <span class="token class-name">uint8_t</span> ucHeap<span class="token punctuation">[</span> configTOTAL_HEAP_SIZE <span class="token punctuation">]</span><span class="token punctuation">;</span>
##endif <span class="token comment">/* configAPPLICATION_ALLOCATED_HEAP */</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>然后，对于pvPortMalloc调用时，从这个数组中分配空间。</p><p>FreeRTOS在创建任务时，需要2个内核对象：task control block(TCB)、stack。 使用heap_1时，内存分配过程如下图所示：</p><ul><li>A：创建任务之前整个数组都是空闲的</li><li>B：创建第1个任务之后，蓝色区域被分配出去了</li><li>C：创建3个任务之后的数组使用情况</li></ul><img src="http://photos.100ask.net/rtos-docs/freeRTOS/DShanMCU-F103/chapter-8/image3.png" alt="image3" style="zoom:67%;"><h3 id="_8-2-2-heap-2" tabindex="-1"><a class="header-anchor" href="#_8-2-2-heap-2" aria-hidden="true">#</a> 8.2.2 Heap_2</h3><p>Heap_2之所以还保留，只是为了兼容以前的代码。新设计中不再推荐使用Heap_2。建议使用Heap_4来替代Heap_2，更加高效。</p><p>Heap_2也是在数组上分配内存，跟Heap_1不一样的地方在于：</p><ul><li>Heap_2使用最佳匹配算法(best fit)来分配内存</li><li>它支持vPortFree</li></ul><p>最佳匹配算法：</p><ul><li>假设heap有3块空闲内存：5字节、25字节、100字节</li><li>pvPortMalloc想申请20字节</li><li>找出最小的、能满足pvPortMalloc的内存：25字节</li><li>把它划分为20字节、5字节 <ul><li>返回这20字节的地址</li><li>剩下的5字节仍然是空闲状态，留给后续的pvPortMalloc使用</li></ul></li></ul><p>与Heap_4相比，Heap_2不会合并相邻的空闲内存，所以Heap_2会导致严重的&quot;碎片化&quot;问题。</p><p>但是，如果申请、分配内存时大小总是相同的，这类场景下Heap_2没有碎片化的问题。所以它适合这种场景：频繁地创建、删除任务，但是任务的栈大小都是相同的(创建任务时，需要分配TCB和栈，TCB总是一样的)。</p><p>虽然不再推荐使用heap_2，但是它的效率还是远高于malloc、free。</p><p>使用heap_2时，内存分配过程如下图所示：</p><ul><li>A：创建了3个任务</li><li>B：删除了一个任务，空闲内存有3部分：顶层的、被删除任务的TCB空间、被删除任务的Stack空间</li><li>C：创建了一个新任务，因为TCB、栈大小跟前面被删除任务的TCB、栈大小一致，所以刚好分配到原来的内存</li></ul><img src="http://photos.100ask.net/rtos-docs/freeRTOS/DShanMCU-F103/chapter-8/image4.png" alt="image43" style="zoom:67%;"><h3 id="_8-2-3-heap-3" tabindex="-1"><a class="header-anchor" href="#_8-2-3-heap-3" aria-hidden="true">#</a> 8.2.3 Heap_3</h3><p>Heap_3使用标准C库里的malloc、free函数，所以堆大小由链接器的配置决定，配置项configTOTAL_HEAP_SIZE不再起作用。</p><p>C库里的malloc、free函数并非线程安全的，Heap_3中先暂停FreeRTOS的调度器，再去调用这些函数，使用这种方法实现了线程安全。</p><h3 id="_8-2-4-heap-4" tabindex="-1"><a class="header-anchor" href="#_8-2-4-heap-4" aria-hidden="true">#</a> 8.2.4 Heap_4</h3><p>跟Heap_1、Heap_2一样，Heap_4也是使用大数组来分配内存。</p><p>Heap_4使用 <strong>首次适应算法(first fit)来分配内存</strong> 。它还会把相邻的空闲内存合并为一个更大的空闲内存，这有助于较少内存的碎片问题。</p><p>首次适应算法：</p><ul><li>假设堆中有3块空闲内存：5字节、200字节、100字节</li><li>pvPortMalloc想申请20字节</li><li>找出第1个能满足pvPortMalloc的内存：200字节</li><li>把它划分为20字节、180字节</li><li>返回这20字节的地址</li><li>剩下的180字节仍然是空闲状态，留给后续的pvPortMalloc使用</li></ul><p>Heap_4会把相邻空闲内存合并为一个大的空闲内存，可以较少内存的碎片化问题。适用于这种场景：频繁地分配、释放不同大小的内存。</p><p>Heap_4的使用过程举例如下：</p><ul><li>A：创建了3个任务</li><li>B：删除了一个任务，空闲内存有2部分：</li><li>顶层的</li><li>被删除任务的TCB空间、被删除任务的Stack空间合并起来的</li><li>C：分配了一个Queue，从第1个空闲块中分配空间</li><li>D：分配了一个User数据，从Queue之后的空闲块中分配</li><li>E：释放的Queue，User前后都有一块空闲内存</li><li>F：释放了User数据，User前后的内存、User本身占据的内存，合并为一个大的空闲内存</li></ul><img src="http://photos.100ask.net/rtos-docs/freeRTOS/DShanMCU-F103/chapter-8/image5.png" alt="image5" style="zoom:67%;"><p>Heap_4执行的时间是不确定的，但是它的效率高于标准库的malloc、free。</p><h3 id="_8-2-5-heap-5" tabindex="-1"><a class="header-anchor" href="#_8-2-5-heap-5" aria-hidden="true">#</a> 8.2.5 Heap_5</h3><p>Heap_5分配内存、释放内存的算法跟Heap_4是一样的。</p><p>相比于Heap_4，Heap_5并不局限于管理一个大数组：它可以管理多块、分隔开的内存。</p><p>在嵌入式系统中，内存的地址可能并不连续，这种场景下可以使用Heap_5。</p><p>既然内存时分隔开的，那么就需要进行初始化：确定这些内存块在哪、多大：</p><ul><li>在使用pvPortMalloc之前，必须先指定内存块的信息</li><li>使用vPortDefineHeapRegions来指定这些信息</li></ul><p>怎么指定一块内存？使用如下结构体：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">typedef</span> <span class="token keyword">struct</span> <span class="token class-name">HeapRegion</span>
<span class="token punctuation">{</span>
    <span class="token class-name">uint8_t</span> <span class="token operator">*</span> pucStartAddress<span class="token punctuation">;</span> <span class="token comment">// 起始地址</span>
    <span class="token class-name">size_t</span> xSizeInBytes<span class="token punctuation">;</span>       <span class="token comment">// 大小</span>
<span class="token punctuation">}</span> HeapRegion_t<span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>怎么指定多块内存？使用一个HeapRegion_t数组，在这个数组中，低地址在前、高地址在后。 比如：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>HeapRegion_t xHeapRegions<span class="token punctuation">[</span><span class="token punctuation">]</span> <span class="token operator">=</span>
<span class="token punctuation">{</span>
  <span class="token punctuation">{</span> <span class="token punctuation">(</span> <span class="token class-name">uint8_t</span> <span class="token operator">*</span> <span class="token punctuation">)</span> <span class="token number">0x80000000UL</span><span class="token punctuation">,</span> <span class="token number">0x10000</span> <span class="token punctuation">}</span><span class="token punctuation">,</span> <span class="token comment">// 起始地址0x80000000，大小0x10000</span>
  <span class="token punctuation">{</span> <span class="token punctuation">(</span> <span class="token class-name">uint8_t</span> <span class="token operator">*</span> <span class="token punctuation">)</span> <span class="token number">0x90000000UL</span><span class="token punctuation">,</span> <span class="token number">0xa0000</span> <span class="token punctuation">}</span><span class="token punctuation">,</span> <span class="token comment">// 起始地址0x90000000，大小0xa0000</span>
  <span class="token punctuation">{</span> <span class="token constant">NULL</span><span class="token punctuation">,</span> <span class="token number">0</span> <span class="token punctuation">}</span> <span class="token comment">// 表示数组结束</span>
 <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>vPortDefineHeapRegions函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">void</span> <span class="token function">vPortDefineHeapRegions</span><span class="token punctuation">(</span> <span class="token keyword">const</span> HeapRegion_t <span class="token operator">*</span> <span class="token keyword">const</span> pxHeapRegions <span class="token punctuation">)</span><span class="token punctuation">;</span>
\`\`\`c

把xHeapRegions数组传给vPortDefineHeapRegions函数，即可初始化Heap_5。


## <span class="token number">8.3</span> Heap相关的函数

### <span class="token number">8.3</span><span class="token number">.1</span> pvPortMalloc<span class="token operator">/</span>vPortFree

函数原型：

\`\`\`c
<span class="token keyword">void</span> <span class="token operator">*</span> <span class="token function">pvPortMalloc</span><span class="token punctuation">(</span> <span class="token class-name">size_t</span> xWantedSize <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">void</span> <span class="token function">vPortFree</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token operator">*</span> pv <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_8-3-heap相关的函数" tabindex="-1"><a class="header-anchor" href="#_8-3-heap相关的函数" aria-hidden="true">#</a> 8.3 Heap相关的函数</h2><h3 id="_8-3-1-pvportmalloc-vportfree" tabindex="-1"><a class="header-anchor" href="#_8-3-1-pvportmalloc-vportfree" aria-hidden="true">#</a> 8.3.1 pvPortMalloc/vPortFree</h3><p>函数原型：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">void</span> <span class="token operator">*</span> <span class="token function">pvPortMalloc</span><span class="token punctuation">(</span> <span class="token class-name">size_t</span> xWantedSize <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">void</span> <span class="token function">vPortFree</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token operator">*</span> pv <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div></div></div><p>作用：分配内存、释放内存。</p><p>如果分配内存不成功，则返回值为NULL。</p><h3 id="_8-3-2-xportgetfreeheapsize" tabindex="-1"><a class="header-anchor" href="#_8-3-2-xportgetfreeheapsize" aria-hidden="true">#</a> 8.3.2 xPortGetFreeHeapSize</h3><p>函数原型：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token class-name">size_t</span> <span class="token function">xPortGetFreeHeapSize</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>当前还有多少空闲内存，这函数可以用来优化内存的使用情况。比如当所有内核对象都分配好后，执行此函数返回2000，那么configTOTAL_HEAP_SIZE就可减小2000。</p><p>注意：在heap_3中无法使用。</p><h3 id="_8-3-3-xportgetminimumeverfreeheapsize" tabindex="-1"><a class="header-anchor" href="#_8-3-3-xportgetminimumeverfreeheapsize" aria-hidden="true">#</a> 8.3.3 xPortGetMinimumEverFreeHeapSize</h3><p>函数原型：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token class-name">size_t</span> <span class="token function">xPortGetMinimumEverFreeHeapSize</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>返回：程序运行过程中，空闲内存容量的最小值。</p><p>注意：只有heap_4、heap_5支持此函数。</p><h3 id="_8-3-4-malloc失败的钩子函数" tabindex="-1"><a class="header-anchor" href="#_8-3-4-malloc失败的钩子函数" aria-hidden="true">#</a> 8.3.4 malloc失败的钩子函数</h3><p>在pvPortMalloc函数内部：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token keyword">void</span> <span class="token operator">*</span> <span class="token function">pvPortMalloc</span><span class="token punctuation">(</span> <span class="token class-name">size_t</span> xWantedSize <span class="token punctuation">)</span>vPortDefineHeapRegions
<span class="token punctuation">{</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
    <span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">if</span> <span class="token expression"><span class="token punctuation">(</span> configUSE_MALLOC_FAILED_HOOK <span class="token operator">==</span> <span class="token number">1</span> <span class="token punctuation">)</span></span></span>
        <span class="token punctuation">{</span>
            <span class="token keyword">if</span><span class="token punctuation">(</span> pvReturn <span class="token operator">==</span> <span class="token constant">NULL</span> <span class="token punctuation">)</span>
            <span class="token punctuation">{</span>
                <span class="token keyword">extern</span> <span class="token keyword">void</span> <span class="token function">vApplicationMallocFailedHook</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
                <span class="token function">vApplicationMallocFailedHook</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">}</span>
        <span class="token punctuation">}</span>
    <span class="token macro property"><span class="token directive-hash">#</span><span class="token directive keyword">endif</span></span>
    
    <span class="token keyword">return</span> pvReturn<span class="token punctuation">;</span>        
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>所以，如果想使用这个钩子函数：</p><ul><li>在FreeRTOSConfig.h中，把configUSE_MALLOC_FAILED_HOOK定义为1</li><li>提供vApplicationMallocFailedHook函数</li><li>pvPortMalloc失败时，才会调用此函数</li></ul>`,69);function k(v,m){const e=t("ExternalLinkIcon");return i(),l("div",null,[r,n("p",null,[a("参考文章："),n("a",u,[a("FreeRTOS说明书吐血整理【适合新手+入门】"),o(e)])]),d])}const _=p(c,[["render",k],["__file","chapter8.html.vue"]]);export{_ as default};
