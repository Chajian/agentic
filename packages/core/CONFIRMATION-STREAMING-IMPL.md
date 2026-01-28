部署和水平扩展
- ✅ 支持多实例n
firmationdingCon次请求从数据库加载 pe 每保存状态
- ✅在内存中 不Agent状态设计
- ✅ 续传）

### 无支持断点个事件都有唯一 ID（✅ 每前端
- 化发送给 SSE 格式调函数传递事件
- ✅onEvent 回
- ✅ 创建事件统一 ✅ 事件工厂函数
-## 流式事件无限循环

#n 避免irmationf ✅ skipCo态）
-据库（无状rmation 存储在数fi✅ pendingCon
- 测工具调用（不实际执行）- ✅ 使用 LLM 预认机制
 确键要点

###
## 4. 关
---
 1 }
```
Calls:oltorations: 1,  2345, itetalDuration:] { toedplet
// [come }fals: lete', isComp除...成功删ent: '已ntchunk] { cot_[conten1234 }
// uration: ess: true, donfig', succete_boss_ce: 'delamolNtod] { ompleteall_c/ [tool_c... }
/g', s_confioselete_b 'dtoolName:d] { artel_st[tool_cal/ 10 }
/: axIterations, mion: 1at iterrted] {sta[iteration_57' }
// eId: 'msg_4ssagrted] { meocessing_sta[pr 控制台输出：
// 
});

//ata);
  }]`, event.de}event.typog(`[${.l
    console{ =>  (event)Event:on,
  onfirmatie.pendingConns responfirmation:pendingCo
  ','session_123d: sessionI {
  at("确认",cht.agenwait esponse2 = aconst r用户确认后
nse

// pormRes返回 Confi// → .' }
ng..n: 'Checkiiptio{ descrion_check] / [confirmatnfig'] }
/ss', 'coies: ['bo, categorount: 2tCdocumen{ ed] evetriwledge_r
// [kno56' }eId: 'msg_4ag messarted] {rocessing_st制台输出：
// [p

// 控;a);
  }
}) event.dattype}]`,vent.`[${ensole.log(co
    ) => {: (event
  onEvent3','session_12ssionId: ", {
  se Boss 配置hat("删除所有 agent.c = awaitponse
const res 用户发送消息pescript
//
```ty. 完整示例

## 3`

---

});
``ce.close();eventSour
  ('完成');atus;
  showSt.data)parse(eent = JSON.onst ev=> {
  c(e) ', ed('complettenerEventLise.addntSourc;

eve})ame}`);
data.toolNent.{ev正在执行: $atus(`owSta);
  shse(e.dat= JSON.parent st evone) => {
  cd', (ll_startecatener('tool_ntLise.addEve
eventSourc;
});
s('正在处理...')
  showStatu);e.datae(= JSON.parsnst event  => {
  coarted', (e)sing_st'procestListener(e.addEventSourc
evenam');
chat/stre/api/agent/ventSource('new ESource = t event
conscript
```types

### 前端接收`

``d",...}
//ng_startesioces:"pr"type"",_104067200000_17"id":"evt
// data: {ng_started: processi_1
// event00000t_17040672：
// id: ev 输出示例;
}

//oin('\n')
  ].j结束
    ''事件/ 空行表示  '',  /t)}`,
  ingify(even{JSON.str $data:}`,
    `t.type: ${evenentev  `nt.id}`,
  {eve
    `id: $return [g {
  strinvent): mE: Streavent(eentormatSSEEvfunction fort 
exp格式件格式化为 SSE ript
// 将事scype式化

```t 格SSE`

### }
``
e;responsrn 

  retu;Calls)) toolons,atiration, itersageId, dussionId, mesEvent(seteCompletedvent?.(crea完成
  onE/ 5.  /);

 ...
  }    // ticLoop
// 传递给 AgenEvent,  t, {
    onntex toolCorun(message,icLoop.gents.ait thiResult = awaloopconst   送更多事件）
op（内部会发icLo 4. 执行 Agent
  //));
cking...'ionId, 'Chent(sessveionCheckEonfirmatcreateCEvent?.( 确认检查
  on

  // 3.gories));atelength, cresults.ssionId, vedEvent(seietreReeKnowledgnt?.(creatvenEssage);
  och(mearever.setrireait this.awt results = 
  cons2. 知识检索

  // Id));ageId, messnt(sessionartedEvengStsioces(createPrEvent?. on1. 开始处理
 

  // ?? {};s optionvent } = onEnst { cose> {
  on<AgentRespns): PromisetOptio?: Chaionsng, optssage: strimec chat(asynescript


```typ使用## 在 Agent 中``

#12 个工厂函数
`
// ... 其他  };
}
},
 s  argts:argumename, , toolNolCallIdto{ 
    data: d),d', sessionIteall_star_c'toolseEvent(createBa {
    ...urn  retedEvent {
oolCallStart: Tnown>
)<string, unk Recordg,
  args:lName: strintooring,
  lCallId: st  toong,
risionId: st  sesnt(
tartedEvellSeToolCanction creatort fu
}

expId },
  };: { message   datad),
 nIed', sessio_startsingnt('procesteBaseEvecrea...urn {
    ret
  ent {StartedEvProcessing
): tringageId: sess  mstring,
nId:  sessio
 tedEvent(Starrocessing createPction
export fun具体事件工厂函数}

//  };

 ssionId,),
    se Date.now(imestamp:    t   type,
Id(),
 ntteEvegenera
    id: return {Base {
  SEEvent
): SstringionId:  sessT,
 pe: e>(
  tyypds SSEEventTxtenvent<T eateBaseEunction cre创建基础事件
f

// ter}`;
}eventIdCoun${++.now()}_${Datereturn `evt_  
ing {tId(): strenerateEvenction gr = 0;
fununte eventIdCoD
let件 It
// 生成唯一事iptypescr```

### 事件工厂函数

`` 6 种
` ... 其他
  //生错误     // 发          | 'error'  成
  // 处理完      ted'       omple片段
  | 'c    // 内容   k'  tent_chuncon调用完成
  | '// 工具d'   teplel_call_com
  | 'too调用开始'     // 工具ll_started  | 'tool_ca // 确认检查
heck'   _confirmation
  | 'c识检索完成ved'   // 知edge_retrie  | 'knowl开始处理
    // ing_started' 'process=
  |EEventType SS类型
type 4 种事件
// 1 会话 ID
}
tring;   //essionId: s）
  s戳（毫秒 // 时间r;  amp: numbe类型
  timeste;  // 事件EventTypSE
  type: S0000_1vt_170406720 唯一 ID: e         //tring; d: se {
  iBasent SSEEvacenterf构
i/ 基础事件结
/iptypescr

```t# 事件结构实时显示。

##E 接收并件，前端通过 SS关键节点发送事在处理过程中的回调函数，`onEvent` 
通过  核心思路###. 流式事件实现

# 2-

#
```

--ig 工具confte_boss_
实际执行 dele)
  ↓tion: true }Confirma消息, { skip原始t(执行: cha
  └─ 重新= truefirmed 确认' → con== 'e = messag
  ├─ 检查:e()nResponsfirmatioandleCon↓
h认"
  用户回复: "确库
  ↓
ation 到数据nfirmpendingCo ↓
存储 tion）
 onfirma含 pendingCse（包onResp Confirm)
  └─ 返回mResponse(eConfir
  ↓
creatments }e, argutoolNam └─ 返回: {  'high'
 ===.riskLevel oss_confige_blet─ 检查: de
  ├s_configlete_bos会调用 de:  预测─ LLMd()
  ├edetionNeirmackConf
che"
  ↓s 配置有 Bos"删除所``
用户: ## 完整流程

`

#
```状态
  });
}ned,   // 清除on: undefinfirmatiCoending   p
 环/ 避免无限循        /  ue, on: tripConfirmatins,
    sk    ...optiossage, {
rMeing.usechat(pends.n thietur  r
，跳过确认检查 // 重新执行原始消息  }

 取消。' };
ssage: '操作已mete', : 'execu{ typern    retuirmed) {
  (!conf());

  iftrimrCase().toLowesage.ludes(mes   .inc, 'ok']
 confirm'认', '确定', ''确 '是', 'y',yes', nfirmed = ['
  const coResponse> {gentmise<As
): ProtionatOpions?: Ch
  optring,e: stagss,
  mermationgConfiPendin  pending: se(
onResponnfirmatihandleCote async 
priva确认用户骤 3：处理}

// 步
  };

    }te(), new Damestamp:
      ti message,userMessage:nts,
      gumefo.ars: toolIn argumentme,
     toolNafo.oolIntoolName: t      tion: {
ingConfirmapend
    ents)}`,olInfo.argumstringify(toSON.\n参数: ${JoolName}toolInfo.t ${iew: `工具:,
    prev'high'k: `,
    risme}，请确认是否继续？Na.tooltoolInfo: ${行操作sage: `即将执m',
    mese: 'confir  typ{
  {
  return e esponsConfirmRInfo): toolnse(irmRespo createConf应
private步骤 2：创建确认响
}

// l;ulturn n

  re  }
  }
  } };
           ,
  umentsolCall.argnts: toume       arg,
   ame.noolCalle: tlNamoo        treturn {
           {
h'))=== 'higevel l.riskLoo|| tonfirmation requiresCl.ool && (too      if (tname);
lCall.tTool(tooger.geManauginthis.plst tool =    con  lls) {
 se.toolCaf responCall onst tool for (co  {
  0) ngth >Calls.lee.tool responsoolCalls &&.tonse (resp if具是否需要确认
 测的工检查预);

  // tions
  Defini,
    tool },
    ]agetent: messser', con role: 'u
      {emPrompt },: syst, contentsystem' ' role:    {
    [',
  lingool_cal  'tthTools(
  teWinager.generallmMaawait this.nse =  respo
  const）调用哪个工具（不实际执行LM 预测会用 L
  // 
的工具
  };  // 没有需要确认urn null ret {
   ength === 0)tionTools.lf (confirma  );

  i  级为高
险等   // 或者风   'high'iskLevel ===ol.r to认
      工具标记为需要确|  //on |nfirmatiuiresCo tool.req   > 
  ol) =er((to    .filtls()
listTooger
    .ginManas.pluls = thiirmationToost conf
  con需要确认的工具获取所有// 
   null> {
  unknown> } |d<string, s: Recorrgument string; a{ toolName:ise< Prom string
):rompt:  systemPe: string,
  messageeded(
nfirmationNheckCo ce asyncat是否需要确认
priv 步骤 1：检查ript
//typesc
```
## 实现代码。

#，等用户确认后再实际执行返回确认请求就先工具，如果是高风险工具*会调用哪个g 能力**预测*Callinion M 的 Funct使用 LL
### 核心思路
1. 确认机制实现

## 实现详解
和流式事件的认机制# 确