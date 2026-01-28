交互体验！
Agent I 的 A全、实时、用户友好
两者结合，提供了安 + SSE 格式化
 onEvent 回调件工厂 +* = 事*流式事件*
*执行户确认 + 重新 预测 + 用机制** = LLM结

**确认5. 总

## 展

---支持多实例部署和水平扩载状态
- 每次请求都从数据库加tion
- irmaonfpendingC不在内存中保存 - Agent *
：*计

✅ **关键点3 无状态设
### 4. ID 和时间戳
- 每个事件都有唯一件
 回调函数传递事onEvent统一创建事件
- 函数s）协议
- 事件工厂nt Eventer-Se SSE（Serv
- 使用*实现要点：**
✅ *D）
断点续传（通过事件 I
- 支持等待）- 用户体验更好（不用处理进度
**
- 实时反馈点：*优
✅ *
# 4.2 流式事件无限循环

##mation 标志避免skipConfir）
- 据库（无状态mation 存储在数dingConfir pen不实际执行）
- LLM 预测工具调用（要点：**
- 使用

✅ **实现- 支持取消操作
作内容可以预览操用户要确认）
- 作需误操作（高风险操
- 防止*

✅ **优点：*机制4.1 确认

### # 4. 关键设计要点
---

#```
ms)"
完成 (总耗时 2345"端显示:  前d
    →lete comp

10.""已成功删除...示:   → 前端实时显nt_chunk
 conte"

9.  (1234ms): "工具执行成功
   → 前端显示tedomplel_cl_cal"

8. toofigcone_boss_let: "正在调用: de
   → 前端显示_startedl_call7. too代"

"第 1 次迭   → 前端显示: arted
on_stterati"

6. i...前端显示: "正在执行ted
   → g_star processin：

5.
事件流继续ion）
  ↓rmatonfindingC求（带 pe ↓
前端发送新请认]
 
用户点击 [确确认] [取消]
 [继续？"
     确认是否 请   
    风险等级: 高   ig
   te_boss_conf操作: dele将执行    "即对话框:
  → 前端显示确认殊事件)
   quired (特ion_refirmat"

4. con否需要确认...: "检查是
   → 前端显示n_check confirmatio
3.相关知识"
: "找到 2 个
   → 前端显示ievede_retr. knowledg
2
""正在处理...:  前端显示rted
   →stasing_. proces

1：开始↓
事件流I
   后端 AP →  ↓
前端发送请求"
ss 配置有 Bo除所```
用户: "删用户交互流程


### 3.3 完整的);
```
 }
}d();
 res.en);
    ent)rorEvvent(eratSSEEite(form res.wr;
   alse
    )
      fing(error),ge : Str error.messar ?eof Errostancrror in',
      eKNOWN_ERROR,
      'UN sessionIdvent(
     rE createErro =errorEventt   cons  送错误事件
    // 发) {
h (error 
  } catc   
end();
    res./ 结束连接  /

  t));
    }firmEvenEEvent(cone(formatSS res.writ};
     se,
      : respon   data
     onId,    sessinow(),
    mp: Date.  timesta     
  const,ed' asation_requironfirm 'c   type:,
     ventId()eErat    id: gene = {
    firmEventonnst c    co
  firm') {e === 'conponse.typ    if (res认响应，发送特殊事件
/ 如果是确;

    /事件回调
    })/ 传入ent,  /      onEvtion,
irmandingConf,
      pe    historynId,
   sessio     {
 (message,hatnt.cagee = await respons  const 用 Agent
   调y {
    //
  tr));
  };
vent(eventatSSEE(formes.write事件
    r  // 格式化并发送 {
  t) =>StreamEven= (event:  onEvent const
  函数  // 创建事件回调alive');

keep-, 'nection'('ConsetHeaderes.che');
  ro-catrol', 'nache-Conader('CHes.set;
  reent-stream'), 'text/evype'-TtentConr('etHeade应头
  res.sSE 响 设置 S;

  // = req.bodyfirmation } pendingConory,stonId, hiessi message, s {  const> {
res) =sync (req, , a/stream'agent/chatpost('/api/p.例
aps.js 示 Expres
//`typescriptAPI 示例

`` 后端  3.2``

###);
`lose();
}ource.c
  eventSmessage);vent.data.rror(e  showEe);
ata.messagevent.d'错误:', e.error(consol
  ;arse(e.data)ON.pvent = JS{
  const e (e) => r',tener('erroentLis.addEventSource;
});

evclose()ventSource.
  e('完成');Status
  showns} 次迭代`);tioera.data.it}ms, ${eventlDuration.data.totavent理完成: ${elog(`处le.);
  consoataparse(e.d= JSON. event 
  const) => {mpleted', (eer('coentListurce.addEvenentSo
ev});
时显示内容
t);  // 实ata.contenevent.dntent(dCo
  appen(e.data);= JSON.parseevent {
  const  => unk', (e)t_chcontenr('ventListenedEadce.
eventSour);
n}ms)`);
}ata.duratiot.d{evene} ($ta.toolNam${event.da(`工具完成: e.log
  consol.data);JSON.parse(e= t nst even
  co', (e) => {ed_complet('tool_calltListeneraddEvenentSource.);

ev
});me}`Natoolt.data.${even`正在执行: tatus();
  showS.toolName}`.data{eventg(`调用工具: $e.loonsol
  c.data);arse(et = JSON.p const even{
 ', (e) => _startedl_calltener('tooventLisSource.addE
event;
});
否需要确认...')Status('检查是on);
  showriptiescent.data.d检查确认:', evg('le.loonso);
  c.data(eJSON.parsevent =  enst> {
  co (e) =k',mation_checnfiristener('cotLe.addEvenentSourc});

ev);
} 个相关知识`entCountdocuma.atnt.dve${e到 us(`找 showStat;
 nt} 个相关文档`)ocumentCouevent.data.d检索到 ${onsole.log(` ce.data);
 N.parse( event = JSOnst => {
  coved', (e)ledge_retrieener('knowaddEventListurce.ventSo
e
});
在处理...');owStatus('正;
  shgeId)a.messa, event.dat('开始处理:'ole.log  cons.data);
e(eN.parsent = JSOonst eve) => {
  c_started', (essingstener('procaddEventLiventSource.件
e型的事不同类

// 监听eam');/str/agent/chatource('/apitSvence = new EeventSour 连接
const tSource/ 创建 Evenscript
/
```type.1 前端使用示例
## 3
#. 完整示例
---

## 3/
```

"}}
/"msg_456messageId":data":{"_123","":"session"sessionId00000,:17040672"timestamp"ed",ing_start":"processype","t067200000_11704:"evt_{"id"
// data: tedaressing_st: proc/ event
/0_1720000_170406evtid: 输出：
// }

// 示例 '\n';
('\n') +oinrn lines.j事件结束
  retu行表示  // 空es.push('');
  linSON） // 事件数据（Jevent)}`); y(ON.stringif${JSata: s.push(`d件类型
  line   // 事e}`);   event.typvent: ${h(`elines.pus// 事件 ID
           t.id}`);   ${evensh(`id:pu  lines.ng[] = [];
 lines: stri
  const: string {Event)Streament(event: ormatSSEEvn ffunctioport 式
exSE 格化为 S// 将事件格式
typescript

```格式化# 2.4 SSE ```

##
}
;
  } errorow
    thr
    
    )); false,
     or)ing(err Strsage :es? error.mof Error nceor insta
      errode,rCro
      er  sessionId,  (
  eErrorEventt?.(creat    onEvene(error);
rToCodmapErro this.de =t errorCo
    cons发送 error 事件    // 6. {
ch (error)    
  } cat);
 opResultponse(loResResultTothis.loopturn re));

    h
    Calls.lengtoolResult.tloop     tions,
 raopResult.ite lotion,
     ra    totalDud,
  geIessa m     nId,
sio  sesvent(
    mpletedE?.(createCo
    onEventime;startTate.now() - ation = DtalDurnst to 事件
    co发送 completed5. 
    // 
    });
history,d,
      nIessio     s
 Loop Agentic 传递给,  //nt   onEve
   gnal,ons?.abortSioptignal:  abortSi     Ms,
ior.timeouthis.behavimeout: t
      tations,.maxIteris.behaviorrations: thxIte      ma
rompt,temPsys {
      oolContext,, tn(messageticLoop.ruagen this.aitult = awopRes const lo   
件）多事oop（内部会发送更 执行 AgenticL // 4.

     }
    }ed);
    eedtionNnse(confirmaspoirmRereateConfn this.ctur       re
 ded) {Neermation (confi     ifrompt);
 emP, systeded(messageionNeatirmcheckConf await this.Needed =ationonfirm    const c
      
  ));mation'res confirequieration rif oping CheckessionId, 'ent(sonCheckEvrmatieConfit?.(creat onEven
     ck 事件n_che confirmatio
      // 发送irmation) {ireConfavior.requs.beh && thiionmatfiripCon?.sk!options检查
    if (// 3. 确认  }

     }
       s));
ieth, categors.lengltnId, resuessiot(srievedEvenKnowledgeRetcreateent?.(       onEvy))];
 nt.categorr.docume.map(r => ultsres.new Set(..es = [nst categori   co      0) {
length > (results.   if
   rieved 事件dge_ret发送 knowle      //  
;
     ch(message)ver.sear.retriewait thisresults = ast      condge) {
 ipKnowlens?.skioif (!opt    2. 知识检索
{
    // 
  try d));
d, messageInt(sessionIngStartedEveeProcessi?.(creat件
  onEvented 事g_startssinoce. 发送 pr 1};

  //?? {ptions } = onEvent const { o数
  回调函获取事件  
  // te.now();
e = Da startTim;
  constte.now()}`{Dasg_$`mId ?? essageons?.mptiageId = o  const messow()}`;
ion_${Date.nId ?? `sessns?.session optioonId =st sessi> {
  consentResponise<Ageons): PromChatOptioptions?: ring, : stt(messagechaipt
async typescr``用流式事件

`中使.3 在 Agent 
### 2```
数 ...
其他 11 个工厂函
// ... ,
  };
}
toolCalls }terations, Duration, iId, totalage: { messata
    d sessionId),completed',BaseEvent('..createurn {
    .etvent {
  rletedEr
): CompnumbeCalls:   tool: number,
rationsber,
  iteumion: n totalDurat
 d: string,geI  messa,
tringssionId: s
  seedEvent(mpletion createCofunct
export 
  };
}
 args },ents: argumlName,lCallId, too{ toota:   daId),
  ionessd', sll_starte'tool_caEvent(reateBase  ...c {
  turn
  ret {rtedEvenllSta
): ToolCaown>g, unknd<strins: Recor
  argtring,olName: s
  tod: string,CallI
  toolng,nId: striiot(
  sesslStartedEvenToolCalion createport funct
}

ex},
  };{ messageId     data: ),
onIdd', sessistarteng_processi('eBaseEvent ...creat{
   turn 
  rertedEvent {ssingStaProce string
): Id:ssagering,
  messionId: st sevent(
 ingStartedEateProcessn creport functio
ex体事件的工厂函数

// 创建具 };
}d,
 nI sessionow(),
   ate.mp: Dimestae,
    ttypd(),
    EventInerate: ge id
   
  return {{type: T } se & { entBaSSEEvstring
): : ssionIdT,
  setype: Type>(
  nds SSEEvent<T exteseEventteBaon creancti创建基础事件
fu

// unter}`;
}++eventIdCoow()}_${_${Date.n`evteturn  r{
 tring ntId(): sateEveerenction ger = 0;
funntntIdCou ID
let eve
// 生成唯一事件typescript

```2 事件工厂函数2.```

### 迭代次数
  // 达到最大s';     iteration
  | 'max_     // 心跳'        | 'heartbeat
        // 被取消    celled'    | 'can发生错误
 /     /      or'       成
  | 'err理完    // 处d'         plete'com | 策
   // LLM 决         n'   iois
  | 'dec // 确认检查_check'   tionfirma 'con完成
  |/ 知识检索ieved'   /wledge_retr
  | 'kno    // 工具错误    ror'     | 'tool_er用完成
 d'   // 工具调ete_call_compl  | 'tool工具调用开始
ted'     // starl_al'tool_c段
  | / 内容片         /unk'content_ch
  | '// 迭代完成eted'   complteration_  | 'i// 迭代开始
    started' n_teratio开始处理
  | 'i   // ' startedprocessing_| '
  e =SSEEventTyp件类型
type 种事14 

// 
} // 会话 ID string;  Id:
  session（毫秒）   // 时间戳 number;mp:tatimes类型
  ;  // 事件SSEEventTypee:  typ
 ID（用于断点续传）一事件  唯   //      d: string;   i{
EventBase face SSE结构
intert
// 事件基础`typescrip``

结构 核心数据2.1## 

#式事件实现

## 2. 流`

---
``..]
// }lCalls: [./   too配置',
/oss '已成功删除所有 Be: essag  me',
// ecut  type: 'ex{
// 2 = 
// response行实际操作nt 执Age

// 
}); 从数据库加载  //Confirmationdingponse1.penion: resonfirmatingC
  pend {hat("确认",ent.c= await age2 onsnst resp
// 用户确认
co }
储到数据库
//  // 存on: { ... }gConfirmatipendingh',
//   sk: 'hi',
//   ri，请确认是否继续？ss_configdelete_bo作: age: '即将执行操
//   messonfirm',type: 'c {
//    response1 =
//mResponse Confir认，返回测到需要确ent 检;

// Agss 配置")所有 Bo"删除nt.chat(it age = awa response1onst消息
c一次发送
// 用户第iptypescr例

```t.3 完整流程示

### 1
```
  });
}状态 // 清除待确认undefined,  ation: dingConfirm    pen循环
，避免无限检查跳过确认      // e,     ation: trunfirm skipCo
   s,...option    essage, {
ending.userM.chat(peturn this行原始消息
  r// 用户确认，重新执
  }

   }
    );led: trueel  { canc
     '操作已取消。',
     e(cuteResponsExeSimpleeatedler.crHanponsehis.resrn t
    retu/ 用户拒绝   /irmed) {
 
  if (!confk';
'o=== ge werMessa   lo
 irm' || === 'confssageerMe    low||
'确定' ==  =gewerMessa  lo' ||
   '确认Message === lower|
    === '是' |ageerMess ||
    lowy'== 'sage =Mes  lower ||
  = 'yes'ssage == lowerMeirmed =
   const conf用户是否确认
  检查// 
  .trim();
werCase()oLo = message.towerMessage
  const lnse> {spo<AgentReomise Pr):
ions?: ChatOpttions  op string,

  message:ion,matnfirCodingng: Penndi  pe
Response(iononfirmateCsync handl at
private```typescrip

户确认骤 4：处理用 步####
}
```

oop ... AgenticL 继续执行

  // ...}
  }nse;
    mResponfir return co行工具
     回确认响应，不执  // 返 
       };
         ),
 Date(new tamp: mes       ti   e,
: messag userMessage
         nts,umeargded.Neeconfirmationnts:   argume     ame,
   eded.toolNationNeme: confirm    toolNa = {
      ongConfirmati   .pendin})
     rmation endingConfition: PmaConfir { pendingmResponse &as Confirse nfirmRespon   (co存储到数据库）
   on 数据（用于ngConfirmatiendi  // 附加 p   
    
   eded);ationNeonse(confirmonfirmRespeCreatse = this.cfirmResponst con   con应
   建确认响   // 创eded) {
   nfirmationNeif (co  
    ompt);
  systemPr, ssageed(meNeedirmationckConfthis.che await eeded =onNt confirmati{
    consation) ireConfirmehavior.requ this.bn &&atioirmnfions?.skipCof (!opt要确认
  i // 检查是否需
 
的代码 ... // ... 前面{
 Response> <Agentns): PromiseatOptio Ch, options?:: stringt(message
async chapescript```tyt() 中使用

# 步骤 3：在 cha`

### };
}
``ll, 2)}`,
 ts, nunfo.argumentoolI.stringify(${JSON: e}\n参数olNamlInfo.to: `工具: ${too preview
   riskLevel,:     risk,

    }rguments,nfo.alIs: too
      param  ),  wn'
  'unkno        e ?? 
ments.namlInfo.argu too       ? 
ts.target ?.argumenlInfo too  ing(
      target: Str     Name,
ololInfo.to    type: to  ction: {
 a续？`,
   是否继olName}，请确认nfo.to作: ${toolI: `即将执行操  messagefirm',
  : 'con {
    type

  returnum';l ?? 'medi?.riskLevetooliskLevel = nst rName);
  cotoolol(toolInfo.r.getTopluginManage= this.ool {
  const tonse rmRespConfi): 
} unknown>;ord<string,ts: Recmen
  argume: string;toolNao: {
  lInfooe(tfirmResponsonte createCt
priva```typescrip2：创建确认响应

步骤 # 认

###是高风险的，就需要确果预测的工具 如只是预测
- 不实际执行工具，哪个工具
- 能力预测会调用ngtion CalliM 的 FuncLL**
- 使用 **关键点：```

 不需要确认
}
 null;  //
  return}

   error }); needed', {ionnfirmat to check coedn('Failgger.warhis.lo
    t{rror) catch (e
    }
  } }
      
        }         };uments,
 ll.arg toolCaents:   argum         ll.name,
olCatoolName:  to       
      return {        找到需要确认的工具
  //        high')) {
 Level === '| tool.risk |nfirmationuiresCoool.req (tool && (t       if);
 Call.name(tooloolanager.getTthis.pluginMnst tool =      co{
   oolCalls) se.t responl ofnst toolCal(co      for  > 0) {
.lengtholCallsponse.to && restoolCallse.esponsif (r认
    工具是否需要确 检查预测的  // 3.  );

  ns
  initiotoolDef         ],
 ge },
   messatent:ser', con  { role: 'u
      emPrompt }, syst, content:'system':  { role
       ,
      [_calling'   'toolools(
   erateWithTManager.gens.llmthi= await  response  const
   ons();nitigetToolDefiuginManager.is.pltions = thtoolDefini   const ry {
 工具
  tLM 预测会调用哪个/ 2. 用 L
  /}
的工具
  需要确认 没有 //null; turn    re === 0) {
 s.lengthrmationTool  if (confi);

风险等级为高
        // 或者h' == 'higriskLevel =ol.   to记为需要确认
    ||  // 工具标nfirmationquiresCo    tool.re> 
  er((tool) =
    .filt.listTools()    
uginManager= this.plmationTools fironst con工具
  c 获取所有需要确认的/ 1. 
  /l> {
  } | nulnknown>string, unts: Record<; argumeng stri{ toolName:romise<string
): PtemPrompt: ring,
  sysge: st  messad(
deionNeermatfi checkCon async
privatehat() 中 Agent.c
// 在pt``typescri

`确认骤 1：检查是否需要# 步步骤

### 实现

### 1.2
```
}/ 操作预览        /           tring;   preview: s // 风险等级
 'high';   um' |  | 'medilow'isk: '  };
  r // 操作参数
   unknown>;d<string,: Recorarams
    p作目标      // 操      g;        tringet: s名）
    tar工具    // 操作类型（           ring;          type: sttion: {
 消息
  ac// 确认提示                   e: string;  ssag  menfirm';
e: 'co
  typ{rmResponse onfinterface C）
i 确认响应（返回给用户
}

//  // 请求确认的时间                  Date;  amp:imest息
  t/ 原始用户消 /                ge: string;saes参数
  userM  // 工具nown>;nking, uecord<strents: R
  argum的工具名称要确认       // 需             tring;oolName: stion {
  tfirmaingCone Pend库）
interfac储在数据// 待确认状态（存t
typescrip```构

.1 核心数据结

### 1确认机制实现 1. ---

##

整示例)例](#3-完整示件实现)
3. [完实现](#2-流式事)
2. [流式事件](#1-确认机制实现1. [确认机制实现 目录
的实现详解

### 确认机制和流式事件