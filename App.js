import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, StatusBar,
  Platform, Dimensions, Animated, RefreshControl
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OR = '#FF6B35';
const OR2 = '#fff3ef';
const DARK = '#1a1a2e';
const BLUE = '#4361ee';
const GREEN = '#06d6a0';
const PURPLE = '#7209b7';
const RED = '#ef233c';
const BASE = 'http://crm.fastrest.com.tr/api/';
const W = Dimensions.get('window').width;

async function apiCall(ep, params) {
  try {
    const res = await fetch(BASE + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params || {}) });
    return await res.json();
  } catch (e) { return { _err: e.message }; }
}

function parseN(v) {
  if (v === null || v === undefined || v === '') return 0;
  let s = String(v).replace(/\s/g, '').replace(/[₺\u20ba]/g, '');
  if (!s || s === '-') return 0;
  const ci = s.lastIndexOf(','), di = s.lastIndexOf('.');
  if (ci > -1 && di > -1) return di > ci ? parseFloat(s.replace(/,/g, '')) || 0 : parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  if (ci > -1 && di === -1) { const p = s.split(','); if (p[1] && p[1].length === 3 && p.length === 2) return parseFloat(s.replace(/,/g, '')) || 0; return parseFloat(s.replace(',', '.')) || 0; }
  return parseFloat(s) || 0;
}
function fmt(v) { const n = parseN(v); return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(v) { const n = parseN(v); if (n >= 1000000) return '₺' + (n/1000000).toFixed(1)+'M'; if (n >= 1000) return '₺' + (n/1000).toFixed(1)+'K'; return fmt(v); }

function getRange(df, cs, ce) {
  const t = new Date(), fd = d => d.toISOString().split('T')[0];
  let r;
  if (df === 'custom' && cs && ce) r = { start: cs, end: ce };
  else if (df === 'today') r = { start: fd(t), end: fd(t) };
  else if (df === 'yesterday') { const y = new Date(t); y.setDate(y.getDate()-1); r = { start: fd(y), end: fd(y) }; }
  else if (df === 'week') { const w = new Date(t); w.setDate(w.getDate()-7); r = { start: fd(w), end: fd(t) }; }
  else { const m = new Date(t); m.setDate(1); r = { start: fd(m), end: fd(t) }; }
  r.raptar = r.end;
  if (df !== 'custom') r[df] = 1;
  return r;
}

function FadeCard({ children, delay = 0, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [14,0] }) }] }, style]}>{children}</Animated.View>;
}

function Skel({ w, h, r = 8, style }) {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(a,{toValue:1,duration:700,useNativeDriver:true}),Animated.timing(a,{toValue:0.4,duration:700,useNativeDriver:true})])).start(); }, []);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#e8e8e8', opacity: a }, style]} />;
}

function DashSkel() {
  return <View style={{ padding: 14 }}>
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}><Skel w="48%" h={90} r={16}/><Skel w="48%" h={90} r={16}/></View>
    <Skel w="100%" h={80} r={16} style={{ marginBottom: 14 }}/>
    <Skel w={120} h={14} style={{ marginBottom: 10 }}/>
    {[0,1,2,3].map(i => <Skel key={i} w="100%" h={42} r={10} style={{ marginBottom: 6 }}/>)}
  </View>;
}

export default function App() { return <SafeAreaProvider><AppInner /></SafeAreaProvider>; }

function AppInner() {
  const [screen, setScreen] = useState('login');
  const [token, setToken] = useState('');
  const [acc, setAcc] = useState('');
  const [accName, setAccName] = useState('');
  const [uname, setUname] = useState('');
  const [tab, setTab] = useState('dash');
  const [df, setDf] = useState('today');
  const [cs, setCs] = useState('');
  const [ce, setCe] = useState('');
  const [dpVis, setDpVis] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['rp_tok','rp_acc','rp_accName','rp_uname']).then(vals => {
      const m = Object.fromEntries(vals);
      if (m.rp_tok) { setToken(m.rp_tok); setAcc(m.rp_acc||''); setAccName(m.rp_accName||''); setUname(m.rp_uname||''); setScreen(m.rp_acc?'main':'branch'); }
    });
  }, []);

  const mkParams = (extra) => { const p = { token }; if (acc) p.account = acc; return { ...p, ...(extra||{}) }; };
  const doLogout = async () => { await AsyncStorage.clear(); setToken(''); setAcc(''); setScreen('login'); };
  const onLogin = async (tok, name) => { setToken(tok); setUname(name); await AsyncStorage.multiSet([['rp_tok',tok],['rp_uname',name]]); setScreen('branch'); };
  const onBranch = async (id, name) => { setAcc(String(id)); setAccName(name); await AsyncStorage.multiSet([['rp_acc',String(id)],['rp_accName',name]]); setScreen('main'); };

  if (screen === 'login') return <LoginScreen onLogin={onLogin}/>;
  if (screen === 'branch') return <BranchScreen token={token} uname={uname} onSelect={onBranch} onLogout={doLogout}/>;

  const range = getRange(df, cs, ce);

  const Filters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
      {[['today','Bugun'],['yesterday','Dun'],['week','Hafta'],['month','Ay']].map(([f,l]) => (
        <TouchableOpacity key={f} style={[s.fbtn, df===f && s.fbtnOn]} onPress={() => setDf(f)}>
          <Text style={[s.fbtnTxt, df===f && s.fbtnTxtOn]}>{l}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[s.fbtn, df==='custom' && s.fbtnOn]} onPress={() => setDpVis(true)}>
        <Text style={[s.fbtnTxt, df==='custom' && s.fbtnTxtOn]}>
          {df==='custom'&&cs ? `${cs.slice(8)}.${cs.slice(5,7)}-${ce.slice(8)}.${ce.slice(5,7)}` : '📅 Tarih Sec'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.flex} edges={['top']}>
      <StatusBar backgroundColor={DARK} barStyle="light-content" translucent={false}/>
      <View style={s.flex}>
        {tab==='dash' && <DashScreen mkParams={mkParams} uname={uname} accName={accName} range={range} onChangeBranch={()=>setScreen('branch')} Filters={Filters}/>}
        {tab==='rep'  && <ReportsScreen mkParams={mkParams} range={range} Filters={Filters}/>}
        {tab==='adi'  && <AdiScreen mkParams={mkParams} range={range} Filters={Filters}/>}
        {tab==='prof' && <ProfScreen token={token} uname={uname} accName={accName} onLogout={doLogout}/>}
      </View>
      <NavBar tab={tab} setTab={setTab}/>
      <DatePickerModal visible={dpVis} onClose={()=>setDpVis(false)} onApply={(a,b)=>{setCs(a);setCe(b);setDf('custom');setDpVis(false);}} initStart={cs} initEnd={ce}/>
    </SafeAreaView>
  );
}

function NavBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.nav, { paddingBottom: insets.bottom || 10 }]}>
      {[['dash','🏠','Ozet'],['rep','📊','Raporlar'],['adi','🧾','Adisyon'],['prof','👤','Profil']].map(([t,ico,lbl]) => (
        <TouchableOpacity key={t} style={s.navItem} onPress={() => setTab(t)}>
          <View style={[s.navIcoBg, tab===t && s.navIcoBgOn]}><Text style={{ fontSize: 18 }}>{ico}</Text></View>
          <Text style={[s.navLbl, tab===t && { color: OR, fontWeight: '700' }]}>{lbl}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const doLogin = async () => {
    if (!email||!pass) { setErr('E-posta ve sifre gerekli.'); return; }
    setLoading(true); setErr('');
    const d = await apiCall('login', { email, password: pass });
    const tok = d && (d.result||d.token||(d.data&&d.data.token));
    if (tok) onLogin(tok, (d.data&&d.data.user&&d.data.user.name)||email);
    else { setErr((d&&(d.message||d.error||d._err))||'Giris basarisiz.'); }
    setLoading(false);
  };
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:DARK}]} edges={['top','bottom']}>
      <StatusBar backgroundColor={DARK} barStyle="light-content"/>
      <ScrollView contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">
        <View style={s.loginTop}>
          <View style={s.loginLogo}><Text style={{fontSize:38}}>🍽️</Text></View>
          <Text style={s.loginBrand}>FrBoss Panel</Text>
          <Text style={s.loginSub}>Restoran Yonetim Sistemi</Text>
        </View>
        <View style={s.loginCard}>
          <Text style={{fontSize:22,fontWeight:'800',color:DARK,marginBottom:3}}>Hosgeldiniz</Text>
          <Text style={{fontSize:14,color:'#aaa',marginBottom:22}}>Hesabiniza giris yapin</Text>
          {!!err && <View style={s.errBox}><Text style={s.errTxt}>{err}</Text></View>}
          <Text style={s.lbl}>E-posta</Text>
          <TextInput style={s.inp} value={email} onChangeText={setEmail} placeholder="ornek@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#ccc"/>
          <Text style={s.lbl}>Sifre</Text>
          <TextInput style={s.inp} value={pass} onChangeText={setPass} placeholder="••••••••" secureTextEntry onSubmitEditing={doLogin} placeholderTextColor="#ccc"/>
          <TouchableOpacity style={[s.btn,loading&&{opacity:0.6}]} onPress={doLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnTxt}>Giris Yap  →</Text>}
          </TouchableOpacity>
          <Text style={{textAlign:'center',marginTop:16,fontSize:11,color:'#bbb'}}>FrBoss Panel v2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BranchScreen({ token, uname, onSelect, onLogout }) {
  const [branches, setBranches] = useState(null);
  useEffect(() => {
    apiCall('frBossUserAccountList',{token}).then(d => {
      const accs = (d&&d.data&&d.data.accounts)||(d&&d.accounts)||(d&&Array.isArray(d.data)?d.data:null);
      if (accs&&accs.length>1) setBranches(accs);
      else onSelect(accs&&accs[0]?accs[0].id:'', accs&&accs[0]?accs[0].name:uname);
    });
  }, []);
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:'#f2f2f7'}]} edges={['top','bottom']}>
      <View style={[s.hdr,{backgroundColor:DARK}]}>
        <View style={s.flex}><Text style={[s.hdrTitle,{color:'#fff'}]}>Sube Secin</Text><Text style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{uname}</Text></View>
        <TouchableOpacity onPress={onLogout}><Text style={{color:'rgba(255,255,255,.6)',fontSize:13}}>Cikis</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding:14}}>
        {!branches ? <ActivityIndicator color={OR} style={{marginTop:40}}/> :
          branches.map((b,i) => (
            <FadeCard key={b.id} delay={i*60}>
              <TouchableOpacity style={s.brItem} onPress={()=>onSelect(b.id,b.name)}>
                <View style={[s.brIco,{backgroundColor:b.central_db?'#e8eeff':OR2}]}><Text style={{fontSize:24}}>{b.central_db?'🏢':'🍽️'}</Text></View>
                <View style={s.flex}>
                  <Text style={{fontSize:15,fontWeight:'700',color:DARK}}>{b.name}</Text>
                  {b.remaining_date!=null && <Text style={{fontSize:12,color:'#888',marginTop:2}}>{b.remaining_date} gun kaldi</Text>}
                </View>
                <View style={s.arrowBadge}><Text style={{color:OR,fontWeight:'700',fontSize:16}}>›</Text></View>
              </TouchableOpacity>
            </FadeCard>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

function DashScreen({ mkParams, uname, accName, range, onChangeBranch, Filters }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setData(null); }
    Promise.all([
      apiCall('frBossClosedReceipts', mkParams(range)),
      apiCall('frBossOpenReceipts', mkParams(range)),
      apiCall('frBossGeneralComputeData', mkParams()),
      apiCall('frBossTopSales', mkParams({...range,column:'total',sort:'DESC',row:5})),
      apiCall('frBossPaymentMethod', mkParams({...range,column:'total',sort:'DESC',row:'all'})),
    ]).then(([cl,op,gen,prods,pay]) => {
      setData({cl,op,gen,prods,pay});
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => { loadData(); }, [range]);

  const clD = data&&(data.cl.data||data.cl);
  const opD = data&&(data.op.data||data.op);
  const cV = clD ? parseN(clD.totalPrice||clD.total_price) : 0;
  const oV = opD ? parseN(opD.totalPrice||opD.total_price) : 0;

  return (
    <View style={[s.flex,{backgroundColor:'#f2f2f7'}]}>
      <View style={s.dashHero}>
        <View style={s.dashHeroRow}>
          <View style={{flex:1,marginRight:8}}>
            <Text style={{color:'rgba(255,255,255,.6)',fontSize:12}}>Hosgeldin 👋</Text>
            <Text style={{color:'#fff',fontSize:18,fontWeight:'800',marginTop:1}} numberOfLines={1}>{accName}</Text>
          </View>
          <TouchableOpacity style={s.heroBtnBox} onPress={onChangeBranch}><Text style={s.heroBtnTxt}>Sube Degistir</Text></TouchableOpacity>
        </View>
      </View>
      <Filters/>
      <ScrollView
        style={s.flex}
        contentContainerStyle={{padding:14,paddingBottom:16}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadData(true)} colors={[OR]} tintColor={OR}/>}>
        {loading ? <DashSkel/> : <>
          <FadeCard delay={0} style={{flexDirection:'row',gap:10,marginBottom:10}}>
            <View style={[s.statCard,{flex:1,borderLeftWidth:4,borderLeftColor:BLUE}]}>
              <Text style={s.statLbl}>Kapali Adisyon</Text>
              <Text style={[s.statVal,{color:BLUE}]}>{fmt(cV)}</Text>
              <Text style={s.statSub}>{clD&&(clD.tReceipts||0)} adisyon</Text>
            </View>
            <View style={[s.statCard,{flex:1,borderLeftWidth:4,borderLeftColor:GREEN}]}>
              <Text style={s.statLbl}>Acik Adisyon</Text>
              <Text style={[s.statVal,{color:GREEN}]}>{fmt(oV)}</Text>
              <Text style={s.statSub}>{opD&&(opD.OpenReceip||opD.open_receipt||0)} masa</Text>
            </View>
          </FadeCard>
          <FadeCard delay={70}>
            <View style={[s.statCard,{marginBottom:14,borderLeftWidth:4,borderLeftColor:OR}]}>
              <Text style={s.statLbl}>Toplam Ciro</Text>
              <Text style={[s.statVal,{fontSize:26,color:OR}]}>{fmt(cV+oV)}</Text>
            </View>
          </FadeCard>
          <FadeCard delay={120}>
            <Text style={s.secTitle}>Bu Ay Ciro Grafigi</Text>
            <DashCiroChart mkParams={mkParams}/>
          </FadeCard>
          <FadeCard delay={170}>
            <Text style={s.secTitle}>En Cok Satan Urunler</Text>
            <View style={s.listCard}><TopProds data={data.prods}/></View>
          </FadeCard>
          <FadeCard delay={220}>
            <Text style={s.secTitle}>Odeme Yontemleri</Text>
            <View style={s.listCard}><PayMethods data={data.pay}/></View>
          </FadeCard>
        </>}
      </ScrollView>
    </View>
  );
}

function DashCiroChart({ mkParams }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // {idx, item, value}

  useEffect(() => {
    const t = new Date();
    const fd = d => d.toISOString().split('T')[0];
    const start = fd(new Date(t.getFullYear(), t.getMonth(), 1));
    const end = fd(t);
    apiCall('frbossAccountTurnoverSales', mkParams({ start, end, raptar: end }))
      .then(d => { setChartData(d); setLoading(false); });
  }, []);

  if (loading) return <View style={[s.listCard,{padding:20,alignItems:'center'}]}><ActivityIndicator color={OR}/></View>;

  const items = (chartData&&chartData.data)||(Array.isArray(chartData)?chartData:[]);
  if (!items.length) return <View style={[s.listCard,{padding:16}]}><Text style={s.empty}>Veri bulunamadi</Text></View>;

  const values = items.map(i => parseN(i.total));
  const maxVal = Math.max(...values);
  const totalVal = values.reduce((a,b)=>a+b,0);
  const chartH = 110;
  const barW = Math.max((W - 60) / Math.min(items.length, 16), 24);

  const selVal = selected ? parseN(selected.item.total) : null;
  const selDate = selected ? selected.item.date : null;
  const selReceipt = selected ? (selected.item.reciept || selected.item.receipt || 0) : null;

  return (
    <View style={[s.listCard,{padding:14}]}>
      {/* Summary or selected info */}
      {selected ? (
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12,backgroundColor:OR+'12',borderRadius:12,padding:10}}>
          <View>
            <Text style={[s.statLbl,{color:OR}]}>{selDate}</Text>
            <Text style={{fontSize:20,fontWeight:'800',color:OR}}>{fmt(selVal)}</Text>
            <Text style={{fontSize:11,color:'#aaa',marginTop:2}}>{selReceipt} adisyon</Text>
          </View>
          <TouchableOpacity onPress={()=>setSelected(null)} style={{backgroundColor:OR+'22',borderRadius:10,padding:8}}>
            <Text style={{fontSize:13,color:OR,fontWeight:'700'}}>✕ Kapat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <View>
            <Text style={s.statLbl}>Aylik Toplam</Text>
            <Text style={{fontSize:18,fontWeight:'800',color:OR}}>{fmtShort(totalVal)}</Text>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text style={s.statLbl}>En Yuksek Gun</Text>
            <Text style={{fontSize:15,fontWeight:'700',color:GREEN}}>{fmtShort(maxVal)}</Text>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{flexDirection:'row',alignItems:'flex-end',height:chartH+32,gap:3}}>
          {items.map((item,idx)=>{
            const v = parseN(item.total);
            const bH = maxVal>0 ? Math.max((v/maxVal)*chartH, 3) : 3;
            const isMax = v===maxVal;
            const isSel = selected && selected.idx===idx;
            const date = (item.date||'').slice(-5).replace('-','/');
            let barColor = isMax ? OR : BLUE+'80';
            if (isSel) barColor = OR;
            if (!isSel && selected) barColor = BLUE+'40';
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => setSelected(isSel ? null : {idx, item, value: v})}
                style={{alignItems:'center',width:barW}}>
                <View style={{
                  width:barW-4,
                  height:bH,
                  backgroundColor:barColor,
                  borderRadius:5,
                  borderTopLeftRadius:5,
                  borderTopRightRadius:5,
                  ...(isSel && {shadowColor:OR,shadowOpacity:0.5,shadowRadius:6,elevation:4})
                }}/>
                <Text style={{fontSize:8,color:isSel?OR:isMax?OR+'99':'#bbb',fontWeight:isSel?'800':'400',marginTop:4,textAlign:'center'}}>{date}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <Text style={{fontSize:10,color:'#ccc',textAlign:'center',marginTop:4}}>Gune dokunarak detay gorun</Text>
    </View>
  );
}

function GenTable({ data }) {
  if (!data) return <Text style={s.empty}>Veri yok</Text>;
  const src = data.data||data; const arr = Array.isArray(src)?src:[src];
  const get = k => { for (const a of arr) if (a&&a[k]!==undefined) return a[k]; return null; };
  return [['Bugun','todayTotal','today_total','todayPercentage','today_percentage'],
          ['Dun','yesterdayTotal','yesterday_total','yesterdayPercentage','yesterday_percentage'],
          ['Bu Hafta','weekTotal','week_total','weekPercentage','week_percentage'],
          ['Bu Ay','monthTotal','month_total','monthPercentage','month_percentage']
  ].map(([lbl,k1,k2,p1,p2]) => {
    const v = parseN(get(k1)||get(k2)), pc = parseFloat(get(p1)||get(p2))||0, up = pc>=0;
    return (
      <View key={lbl} style={s.tRow}>
        <Text style={{flex:1,color:'#555',fontSize:14}}>{lbl}</Text>
        <Text style={{fontSize:14,fontWeight:'700',color:DARK}}>{fmt(v)}</Text>
        <View style={[s.pcBadge,{backgroundColor:up?'#e8faf4':'#fef1f2',marginLeft:8}]}>
          <Text style={{fontSize:12,fontWeight:'700',color:up?GREEN:RED}}>{up?'+':''}{pc.toFixed(1)}%</Text>
        </View>
      </View>
    );
  });
}

function TopProds({ data }) {
  const items = (data&&data.data)||(Array.isArray(data)?data:[]);
  if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
  const maxP = Math.max(...items.map(i=>parseFloat(i.percentage)||0));
  const clrs = [OR,BLUE,GREEN,PURPLE,'#f72585'];
  return items.slice(0,5).map((i,idx) => (
    <View key={idx} style={{padding:12,borderBottomWidth:idx<4?1:0,borderBottomColor:'#f5f5f5'}}>
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <View style={[s.rankBadge,{backgroundColor:clrs[idx]+'20'}]}><Text style={{fontSize:11,fontWeight:'800',color:clrs[idx]}}>#{idx+1}</Text></View>
        <Text style={{flex:1,fontSize:13,color:DARK,marginRight:8}}>{i.pName||i.p_name||i.name||''}</Text>
        <View style={{alignItems:'flex-end'}}>
          <Text style={{fontSize:13,fontWeight:'800',color:DARK}}>{fmt(i.total)}</Text>
          <Text style={{fontSize:11,color:'#aaa'}}>{i.piece||0} adet</Text>
        </View>
      </View>
      <View style={{height:4,backgroundColor:'#f0f0f0',borderRadius:2,marginTop:8}}>
        <View style={{height:4,backgroundColor:clrs[idx],borderRadius:2,width:`${maxP>0?((parseFloat(i.percentage)||0)/maxP*100):0}%`}}/>
      </View>
    </View>
  ));
}

function PayMethods({ data }) {
  const items = (data&&data.data)||(Array.isArray(data)?data:[]);
  if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
  const clrs = [OR,BLUE,GREEN,PURPLE,'#f72585',RED];
  const total = items.reduce((a,i)=>a+parseN(i.total),0);
  return items.map((i,idx) => (
    <View key={idx} style={s.tRow}>
      <View style={[s.dotBadge,{backgroundColor:clrs[idx%clrs.length]}]}/>
      <Text style={{flex:1,fontSize:14,color:DARK}}>{i.bankName||i.bank_name||i.paymentName||i.name||''}</Text>
      <Text style={{fontSize:13,fontWeight:'700',marginRight:8,color:DARK}}>{fmt(i.total)}</Text>
      <Text style={{fontSize:12,color:'#aaa',minWidth:34,textAlign:'right'}}>%{total>0?(parseN(i.total)/total*100).toFixed(0):0}</Text>
    </View>
  ));
}

function ReportsScreen({ mkParams, range, Filters }) {
  const [sub, setSub] = useState(null);
  if (sub) return <SubReport page={sub} mkParams={mkParams} range={range} onBack={()=>setSub(null)}/>;
  const items = [
    {ico:'📊',c:OR,    title:'Ciro Grafigi',     sub:'Gunluk ciro bar grafigi',  fn:'rpChart'},
    {ico:'📦',c:BLUE,  title:'Urun Satislari',   sub:'En cok satan urunler',     fn:'rpProds'},
    {ico:'👥',c:GREEN, title:'Garson Satislari',  sub:'Personel bazli performans',fn:'rpWaiter'},
    {ico:'🏛️',c:PURPLE,title:'Salon Satislari',  sub:'Salon bazli dagilim',      fn:'rpHall'},
    {ico:'📁',c:'#f72585',title:'Urun Gruplari', sub:'Kategori satislari',       fn:'rpGroups'},
    {ico:'🚫',c:RED,   title:'Iptal/Iade/Ikram', sub:'Islem detaylari',          fn:'rpCancel'},
    {ico:'📅',c:'#4cc9f0',title:'Gunluk Ciro',   sub:'Gunluk satis tablosu',     fn:'rpTurnover'},
    {ico:'💸',c:'#f77f00',title:'Indirim Raporu',sub:'Indirim dokumu',           fn:'rpDiscount'},
  ];
  return (
    <View style={[s.flex,{backgroundColor:'#f2f2f7'}]}>
      <View style={[s.hdr,{backgroundColor:DARK}]}><Text style={[s.hdrTitle,{color:'#fff'}]}>Raporlar</Text></View>
      <Filters/>
      <ScrollView contentContainerStyle={{padding:14,paddingBottom:16}} showsVerticalScrollIndicator={false}>
        {items.map((item,i) => (
          <FadeCard key={item.fn} delay={i*45}>
            <TouchableOpacity style={s.rlink} onPress={()=>setSub(item.fn)}>
              <View style={[s.rlinkIco,{backgroundColor:item.c+'18'}]}><Text style={{fontSize:22}}>{item.ico}</Text></View>
              <View style={s.flex}>
                <Text style={{fontSize:15,fontWeight:'700',color:DARK}}>{item.title}</Text>
                <Text style={{fontSize:12,color:'#888',marginTop:2}}>{item.sub}</Text>
              </View>
              <View style={[s.arrowBadge,{backgroundColor:item.c+'18'}]}><Text style={{color:item.c,fontWeight:'700',fontSize:16}}>›</Text></View>
            </TouchableOpacity>
          </FadeCard>
        ))}
      </ScrollView>
    </View>
  );
}

function SubReport({ page, mkParams, range, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const titles = {rpChart:'Ciro Grafigi',rpProds:'Urun Satislari',rpWaiter:'Garson Satislari',rpHall:'Salon Satislari',rpGroups:'Urun Gruplari',rpCancel:'Iptal/Iade/Ikram',rpTurnover:'Gunluk Ciro',rpDiscount:'Indirim Raporu'};
  useEffect(() => {
    const p = {...range,column:'total',sort:'DESC',row:'all'};
    const load = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      let d;
      if (page==='rpChart'||page==='rpTurnover') d = await apiCall('frbossAccountTurnoverSales',mkParams(range));
      else if (page==='rpProds') d = await apiCall('frBossTopSales',mkParams(p));
      else if (page==='rpWaiter') d = await apiCall('frBossWaiterCashierSales',mkParams(p));
      else if (page==='rpHall') d = await apiCall('frBossHallSales',mkParams(p));
      else if (page==='rpGroups') d = await apiCall('frBossProductGrupSales',mkParams(p));
      else if (page==='rpDiscount') d = await apiCall('frbossDiscountInfo',mkParams({...range,column:'date',sort:'DESC',row:'all'}));
      else if (page==='rpCancel') {
        const types=[{t:4,lbl:'❌ Iptal'},{t:2,lbl:'↩️ Iade'},{t:1,lbl:'🎁 Ikram'},{t:5,lbl:'🚫 Odemez'}];
        const res = await Promise.all(types.map(tp=>apiCall('frBossTableCancellationRefundRefreshment',mkParams({...range,type:tp.t}))));
        d = types.map((tp,i)=>({...tp,data:res[i]}));
      }
      setData(d); setLoading(false); setRefreshing(false);
    };
    load();
  }, []);
  const onRefresh = () => {
    const p = {...range,column:'total',sort:'DESC',row:'all'};
    const reload = async () => {
      setRefreshing(true);
      let d;
      if (page==='rpChart'||page==='rpTurnover') d = await apiCall('frbossAccountTurnoverSales',mkParams(range));
      else if (page==='rpProds') d = await apiCall('frBossTopSales',mkParams(p));
      else if (page==='rpWaiter') d = await apiCall('frBossWaiterCashierSales',mkParams(p));
      else if (page==='rpHall') d = await apiCall('frBossHallSales',mkParams(p));
      else if (page==='rpGroups') d = await apiCall('frBossProductGrupSales',mkParams(p));
      else if (page==='rpDiscount') d = await apiCall('frbossDiscountInfo',mkParams({...range,column:'date',sort:'DESC',row:'all'}));
      else if (page==='rpCancel') {
        const types=[{t:4,lbl:'❌ Iptal'},{t:2,lbl:'↩️ Iade'},{t:1,lbl:'🎁 Ikram'},{t:5,lbl:'🚫 Odemez'}];
        const res = await Promise.all(types.map(tp=>apiCall('frBossTableCancellationRefundRefreshment',mkParams({...range,type:tp.t}))));
        d = types.map((tp,i)=>({...tp,data:res[i]}));
      }
      setData(d); setRefreshing(false);
    };
    reload();
  };

  return (
    <View style={[s.flex,{backgroundColor:'#f2f2f7'}]}>
      <View style={[s.hdr,{backgroundColor:DARK}]}>
        <TouchableOpacity onPress={onBack} style={{marginRight:12,padding:4}}><Text style={{fontSize:22,color:OR}}>←</Text></TouchableOpacity>
        <Text style={[s.hdrTitle,{color:'#fff'}]}>{titles[page]}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{padding:14,paddingBottom:20}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[OR]} tintColor={OR}/>}>
        {loading ? <DashSkel/> : renderReport(page,data)}
      </ScrollView>
    </View>
  );
}

function CiroChart({ data }) {
  const [selected, setSelected] = useState(null);
  const items = (data&&data.data)||(Array.isArray(data)?data:[]);
  if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
  const values = items.map(i=>parseN(i.total));
  const maxVal = Math.max(...values);
  const totalVal = values.reduce((a,b)=>a+b,0);
  const avgVal = totalVal/values.length;
  const barW = Math.max((W-56)/Math.min(items.length,14),28);
  const chartH = 140;
  const selV = selected ? parseN(selected.item.total) : null;
  return <>
    <FadeCard delay={0} style={{flexDirection:'row',gap:8,marginBottom:14}}>
      {[[OR,'Toplam',totalVal],[BLUE,'Ort./Gun',avgVal],[GREEN,'En Yuksek',maxVal]].map(([c,lbl,v])=>(
        <View key={lbl} style={[s.statCard,{flex:1,borderLeftWidth:3,borderLeftColor:c,padding:10}]}>
          <Text style={[s.statLbl,{fontSize:10}]}>{lbl}</Text>
          <Text style={[s.statVal,{color:c,fontSize:14}]}>{fmtShort(v)}</Text>
        </View>
      ))}
    </FadeCard>
    <FadeCard delay={80}>
      <View style={[s.listCard,{padding:16,marginBottom:14}]}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <Text style={{fontSize:14,fontWeight:'700',color:DARK}}>Gunluk Dagilim</Text>
          {selected
            ? <TouchableOpacity onPress={()=>setSelected(null)} style={{backgroundColor:OR+'18',borderRadius:8,paddingHorizontal:10,paddingVertical:4}}>
                <Text style={{fontSize:12,color:OR,fontWeight:'700'}}>✕ Temizle</Text>
              </TouchableOpacity>
            : <Text style={{fontSize:10,color:'#ccc'}}>Bara dokun</Text>
          }
        </View>

        {/* Selected tooltip */}
        {selected && (
          <View style={{backgroundColor:OR+'12',borderRadius:12,padding:12,marginBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <View>
              <Text style={{fontSize:12,color:OR,fontWeight:'700'}}>{selected.item.date}</Text>
              <Text style={{fontSize:22,fontWeight:'800',color:OR,marginTop:2}}>{fmt(selV)}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={s.statLbl}>Adisyon</Text>
              <Text style={{fontSize:18,fontWeight:'800',color:DARK}}>{selected.item.reciept||selected.item.receipt||0}</Text>
            </View>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{flexDirection:'row',alignItems:'flex-end',height:chartH+40,gap:4,paddingBottom:4}}>
            {items.map((item,idx)=>{
              const v=parseN(item.total);
              const bH=maxVal>0?Math.max((v/maxVal)*chartH,4):4;
              const isMax=v===maxVal;
              const isSel=selected&&selected.idx===idx;
              const date=(item.date||'').slice(-5).replace('-','/');
              let barColor = isMax ? OR : BLUE+'90';
              if (isSel) barColor = OR;
              if (!isSel && selected) barColor = BLUE+'35';
              return (
                <TouchableOpacity key={idx} activeOpacity={0.7}
                  onPress={()=>setSelected(isSel?null:{idx,item})}
                  style={{alignItems:'center',width:barW}}>
                  <Text style={{fontSize:8,color:isSel?OR:'transparent',fontWeight:'800',marginBottom:2}}>{fmtShort(v)}</Text>
                  <View style={{width:barW-6,height:bH,backgroundColor:barColor,borderRadius:6,
                    ...(isSel&&{shadowColor:OR,shadowOpacity:0.6,shadowRadius:8,elevation:5})}}/>
                  <Text style={{fontSize:8,color:isSel?OR:isMax?OR+'88':'#bbb',fontWeight:isSel?'800':'400',marginTop:5,textAlign:'center'}}>{date}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </FadeCard>
    <FadeCard delay={150}>
      <View style={s.listCard}>
        {items.map((item,idx)=>{
          const v=parseN(item.total), isMax=v===maxVal, pct=maxVal>0?(v/maxVal*100):0;
          const isSel=selected&&selected.idx===idx;
          return (
            <TouchableOpacity key={idx} activeOpacity={0.7} onPress={()=>setSelected(isSel?null:{idx,item})}
              style={{padding:11,borderBottomWidth:idx<items.length-1?1:0,borderBottomColor:'#f5f5f5',
                backgroundColor:isSel?OR+'0a':'transparent'}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <Text style={{fontSize:13,color:isSel?OR:DARK,fontWeight:isSel?'800':'600'}}>{item.date||''}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                  <Text style={{fontSize:11,color:'#aaa'}}>{item.reciept||item.receipt||0} adisyon</Text>
                  <Text style={{fontSize:14,fontWeight:'800',color:isMax||isSel?OR:DARK}}>{fmt(v)}</Text>
                </View>
              </View>
              <View style={{height:4,backgroundColor:'#f0f0f0',borderRadius:2}}>
                <View style={{height:4,backgroundColor:isMax||isSel?OR:BLUE,borderRadius:2,width:`${pct}%`}}/>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </FadeCard>
  </>;
}

function renderReport(page, data) {
  if (page==='rpChart') return <CiroChart data={data}/>;
  if (page==='rpCancel') {
    if (!Array.isArray(data)) return <Text style={s.empty}>Veri yok</Text>;
    return data.map((tp,gi)=>{
      const items=(tp.data&&tp.data.data)||[];
      return (
        <FadeCard key={tp.t} delay={gi*70}>
          <Text style={[s.secTitle,{marginTop:gi>0?8:0}]}>{tp.lbl}</Text>
          {!items.length
            ? <View style={[s.listCard,{padding:14}]}><Text style={{color:'#aaa',fontSize:13}}>Bu donemde kayit yok</Text></View>
            : <View style={s.listCard}>{items.slice(0,8).map((it,i)=>(
                <View key={i} style={[s.tRow,{borderBottomWidth:i<items.length-1?1:0}]}>
                  <Text style={{flex:1,fontSize:13,color:DARK}}>{it.p_name||it.name||''}</Text>
                  <Text style={{fontSize:13,fontWeight:'700',color:RED,marginRight:8}}>{fmt(it.price)}</Text>
                  <Text style={{fontSize:12,color:'#aaa'}}>x{it.quantity||1}</Text>
                </View>
              ))}</View>
          }
        </FadeCard>
      );
    });
  }
  if (page==='rpTurnover') {
    const items=(data&&data.data)||(Array.isArray(data)?data:[]);
    if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
    const total=items.reduce((a,i)=>a+parseN(i.total),0);
    return <>
      <FadeCard delay={0}><View style={[s.statCard,{borderLeftWidth:4,borderLeftColor:OR,marginBottom:14}]}>
        <Text style={s.statLbl}>Donem Toplami</Text>
        <Text style={[s.statVal,{color:OR,fontSize:24}]}>{fmt(total)}</Text>
        <Text style={s.statSub}>{items.length} gun</Text>
      </View></FadeCard>
      <View style={s.listCard}>{items.map((i,idx)=>(
        <View key={idx} style={[s.tRow,{borderBottomWidth:idx<items.length-1?1:0}]}>
          <View style={s.flex}><Text style={{fontSize:14,fontWeight:'600',color:DARK}}>{i.date||''}</Text><Text style={{fontSize:11,color:'#aaa'}}>{i.reciept||i.receipt||0} adisyon</Text></View>
          <Text style={{fontSize:15,fontWeight:'800',color:OR}}>{fmt(i.total)}</Text>
        </View>
      ))}</View>
    </>;
  }
  if (page==='rpDiscount') {
    const items=(data&&data.data)||(Array.isArray(data)?data:[]);
    if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
    return <View style={s.listCard}>{items.map((i,idx)=>(
      <View key={idx} style={[s.tRow,{borderBottomWidth:idx<items.length-1?1:0}]}>
        <View style={s.flex}><Text style={{fontSize:14,fontWeight:'600',color:DARK}}>{i.date||''}</Text><Text style={{fontSize:11,color:'#aaa'}}>#{i.receipt||''}</Text></View>
        <Text style={{fontSize:15,fontWeight:'800',color:RED}}>-{fmt(i.total_discount||i.totalDiscount||0)}</Text>
      </View>
    ))}</View>;
  }
  const items=(data&&data.data)||(Array.isArray(data)?data:[]);
  if (!items.length) return <Text style={s.empty}>Veri bulunamadi</Text>;
  const maxP=Math.max(...items.map(i=>parseFloat(i.percentage)||0));
  const clrs=[OR,BLUE,GREEN,PURPLE,'#f72585',RED,'#4cc9f0','#f77f00'];
  return <View style={s.listCard}>{items.map((i,idx)=>(
    <View key={idx} style={{padding:12,borderBottomWidth:idx<items.length-1?1:0,borderBottomColor:'#f5f5f5'}}>
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <View style={[s.rankBadge,{backgroundColor:clrs[idx%clrs.length]+'20'}]}><Text style={{fontSize:11,fontWeight:'800',color:clrs[idx%clrs.length]}}>#{idx+1}</Text></View>
        <Text style={{flex:1,fontSize:13,color:DARK,marginRight:8}}>{i.pName||i.p_name||i.name||''}</Text>
        <View style={{alignItems:'flex-end'}}>
          <Text style={{fontSize:13,fontWeight:'800',color:DARK}}>{fmt(i.total)}</Text>
          {(i.piece||i.bill)?<Text style={{fontSize:11,color:'#aaa'}}>{i.piece||i.bill} {page==='rpWaiter'?'adisyon':'adet'}</Text>:null}
        </View>
      </View>
      <View style={{height:4,backgroundColor:'#f0f0f0',borderRadius:2,marginTop:8}}>
        <View style={{height:4,backgroundColor:clrs[idx%clrs.length],borderRadius:2,width:`${maxP>0?((parseFloat(i.percentage)||0)/maxP*100):0}%`}}/>
      </View>
    </View>
  ))}</View>;
}

function AdiScreen({ mkParams, range, Filters }) {
  const [activeTab, setActiveTab] = useState('open');
  const [allItems, setAllItems] = useState([]);
  const [shown, setShown] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async (type, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setAllItems([]); setShown(20); }
    const ep = type==='closed'?'frBossCloseReceiptDetails':'frBossOpenReceiptDetails';
    const d = await apiCall(ep, mkParams({...range,column:'totalfiyat',sort:'DESC',row:'all'}));
    setAllItems((d&&d.data)||(Array.isArray(d)?d:[]));
    setLoading(false);
    setRefreshing(false);
  };
  useEffect(() => { load(activeTab); }, [activeTab, range]);
  const visItems = allItems.slice(0, shown);
  const totalCiro = allItems.reduce((a,i)=>a+parseN(i.totalfiyat||i.total_fiyat||i.total||0),0);
  return (
    <View style={[s.flex,{backgroundColor:'#f2f2f7'}]}>
      <View style={[s.hdr,{backgroundColor:DARK}]}><Text style={[s.hdrTitle,{color:'#fff'}]}>Adisyonlar</Text></View>
      <Filters/>
      <View style={{flexDirection:'row',backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#efefef'}}>
        {[['open','Acik'],['closed','Kapali']].map(([t,l])=>(
          <TouchableOpacity key={t} style={[{flex:1,paddingVertical:12,alignItems:'center'},activeTab===t&&{borderBottomWidth:3,borderBottomColor:OR}]} onPress={()=>setActiveTab(t)}>
            <Text style={{fontSize:14,fontWeight:'700',color:activeTab===t?OR:'#bbb'}}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={s.flex}
        contentContainerStyle={{padding:14,paddingBottom:16}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(activeTab,true)} colors={[OR]} tintColor={OR}/>}>
        {loading ? <DashSkel/> :
         !allItems.length ? <View style={[s.listCard,{padding:30,alignItems:'center',marginTop:10}]}><Text style={{fontSize:40,marginBottom:8}}>🧾</Text><Text style={s.empty}>Adisyon bulunamadi</Text></View> : <>
          <FadeCard delay={0}>
            <View style={[s.statCard,{marginBottom:12,borderLeftWidth:4,borderLeftColor:activeTab==='open'?GREEN:BLUE}]}>
              <Text style={s.statLbl}>{allItems.length} adisyon toplami</Text>
              <Text style={[s.statVal,{color:activeTab==='open'?GREEN:BLUE}]}>{fmt(totalCiro)}</Text>
            </View>
          </FadeCard>
          {visItems.map((i,idx)=><AdiCard key={idx} item={i} idx={idx}/>)}
          {shown<allItems.length && (
            <TouchableOpacity style={s.moreBtn} onPress={()=>setShown(shown+20)}>
              <Text style={{color:OR,fontWeight:'700',fontSize:14}}>Sonraki 20  ({allItems.length-shown} kaldi)</Text>
            </TouchableOpacity>
          )}
        </>}
      </ScrollView>
    </View>
  );
}

function AdiCard({ item: i, idx }) {
  const total=i.totalfiyat||i.total_fiyat||i.total||0;
  const pays=i.payment_types||[], dets=i.details||[];
  return (
    <FadeCard delay={Math.min(idx,6)*50} style={{marginBottom:10}}>
      <View style={[s.listCard,{padding:0}]}>
        <View style={{padding:12}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <View style={[s.rankBadge,{backgroundColor:OR2}]}><Text style={{fontSize:12,fontWeight:'800',color:OR}}>#{i.bill||''}</Text></View>
              <Text style={{fontSize:15,fontWeight:'800',color:DARK}}>Masa {i.tableNo||i.table_no||'?'}</Text>
            </View>
            <Text style={{fontSize:16,fontWeight:'800',color:OR}}>{fmt(total)}</Text>
          </View>
          <Text style={{fontSize:12,color:'#aaa',marginTop:4}}>
            {i.waiter||''}{i.customer?` · ${i.customer} kisi`:''}{i.openDate?` · ${i.openDate}`:''}
          </Text>
        </View>
        {dets.length>0 && (
          <View style={{borderTopWidth:1,borderTopColor:'#f8f8f8',paddingHorizontal:12,paddingBottom:8}}>
            {dets.map((d,di)=>(
              <View key={di} style={{flexDirection:'row',paddingVertical:4,borderBottomWidth:di<dets.length-1?1:0,borderBottomColor:'#fafafa'}}>
                <Text style={{flex:1,fontSize:12,color:'#444',marginRight:8}}>{d.p_name||d.name||''}</Text>
                <Text style={{fontSize:12,color:'#bbb',marginRight:10,minWidth:28}}>x{d.quantity||d.piece||1}</Text>
                <Text style={{fontSize:12,fontWeight:'700',color:DARK,minWidth:64,textAlign:'right'}}>{fmt(d.price)}</Text>
              </View>
            ))}
          </View>
        )}
        {pays.length>0 && (
          <View style={{borderTopWidth:1,borderTopColor:'#f8f8f8',padding:10,flexDirection:'row',flexWrap:'wrap',gap:5}}>
            {pays.map((p,pi)=>(
              <View key={pi} style={{backgroundColor:OR2,borderRadius:8,paddingHorizontal:9,paddingVertical:3}}>
                <Text style={{fontSize:11,color:OR,fontWeight:'700'}}>{p.payment_name||p.name||''}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </FadeCard>
  );
}

function ProfScreen({ token, uname, accName, onLogout }) {
  const [info, setInfo] = useState({});
  useEffect(() => { apiCall('frBossProfilePersonalInfo',{token}).then(d=>setInfo((d&&d.data)||{})); }, []);
  const Row = ({ico,lbl,val}) => (
    <View style={[s.tRow,{paddingVertical:14}]}>
      <Text style={{marginRight:12,fontSize:18}}>{ico}</Text>
      <Text style={{flex:1,fontSize:14,color:'#666'}}>{lbl}</Text>
      <Text style={{fontSize:13,fontWeight:'600',color:DARK}}>{val||'-'}</Text>
    </View>
  );
  return (
    <View style={[s.flex,{backgroundColor:'#f2f2f7'}]}>
      <View style={[s.hdr,{backgroundColor:DARK}]}><Text style={[s.hdrTitle,{color:'#fff'}]}>Profil</Text></View>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:30}}>
        <FadeCard delay={0}>
          <View style={[s.listCard,{alignItems:'center',padding:28,marginBottom:14}]}>
            <View style={{width:88,height:88,borderRadius:44,backgroundColor:OR2,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:OR,marginBottom:14}}>
              <Text style={{fontSize:36}}>👤</Text>
            </View>
            <Text style={{fontSize:22,fontWeight:'800',color:DARK}}>{uname}</Text>
            <View style={[s.pcBadge,{backgroundColor:OR2,marginTop:8}]}>
              <Text style={{fontSize:12,fontWeight:'700',color:OR}}>{accName}</Text>
            </View>
          </View>
        </FadeCard>
        <FadeCard delay={80}>
          <View style={s.listCard}>
            <View style={{padding:14,borderBottomWidth:1,borderBottomColor:'#f5f5f5'}}>
              <Text style={{fontSize:12,fontWeight:'700',color:'#aaa',letterSpacing:0.5}}>HESAP BILGILERI</Text>
            </View>
            <Row ico="📧" lbl="E-posta" val={info.email||info.mail||''}/>
            <Row ico="📱" lbl="Telefon" val={info.mobile||info.phone||''}/>
            <Row ico="📍" lbl="Sehir" val={info.city||''}/>
          </View>
        </FadeCard>
        <FadeCard delay={140}>
          <TouchableOpacity style={[s.btn,{backgroundColor:RED,marginTop:16}]} onPress={onLogout}>
            <Text style={s.btnTxt}>🚪  Cikis Yap</Text>
          </TouchableOpacity>
        </FadeCard>
      </ScrollView>
    </View>
  );
}

function DatePickerModal({ visible, onClose, onApply, initStart, initEnd }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [start, setStart] = useState(initStart||'');
  const [end, setEnd] = useState(initEnd||'');
  const [picking, setPicking] = useState('start');
  const MONTHS=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
  const DAYS=['Pt','Sa','Ca','Pe','Cu','Ct','Pz'];
  const adj=(new Date(year,month,1).getDay()+6)%7;
  const dim=new Date(year,month+1,0).getDate();
  const dip=new Date(year,month,0).getDate();
  const total=Math.ceil((adj+dim)/7)*7;
  const cells=[];
  for(let i=0;i<total;i++){
    let dayNum,dateStr='',other=false;
    if(i<adj){dayNum=dip-adj+i+1;other=true;}
    else if(i>=adj+dim){dayNum=i-adj-dim+1;other=true;}
    else{dayNum=i-adj+1;const mm=String(month+1).padStart(2,'0'),dd=String(dayNum).padStart(2,'0');dateStr=`${year}-${mm}-${dd}`;}
    cells.push({dayNum,dateStr,other,isSt:dateStr===start,isEn:dateStr===end,inRng:!!(dateStr&&start&&end&&dateStr>start&&dateStr<end)});
  }
  const onDay=d=>{
    if(!d)return;
    if(picking==='start'){setStart(d);setEnd('');setPicking('end');}
    else{if(d<start){setEnd(start);setStart(d);}else setEnd(d);setPicking('start');}
  };
  const fmt2=s=>s?`${s.slice(8)}.${s.slice(5,7)}.${s.slice(0,4)}`:'---';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20}}>
          <View style={{width:36,height:4,backgroundColor:'#e0e0e0',borderRadius:2,alignSelf:'center',marginBottom:16}}/>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <TouchableOpacity onPress={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{padding:8}}>
              <Text style={{fontSize:26,color:OR}}>‹</Text>
            </TouchableOpacity>
            <Text style={{fontWeight:'800',fontSize:17,color:DARK}}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{padding:8}}>
              <Text style={{fontSize:26,color:OR}}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',marginBottom:6}}>
            {DAYS.map(d=><Text key={d} style={{flex:1,textAlign:'center',fontSize:11,fontWeight:'700',color:'#aaa'}}>{d}</Text>)}
          </View>
          <View style={{flexDirection:'row',flexWrap:'wrap'}}>
            {cells.map((c,idx)=>(
              <TouchableOpacity key={idx}
                style={[{width:'14.28%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:10},
                  c.inRng&&{backgroundColor:OR2},(c.isSt||c.isEn)&&{backgroundColor:OR}]}
                onPress={()=>onDay(c.dateStr)} disabled={!c.dateStr||c.other}>
                <Text style={[{fontSize:14},c.other&&{color:'#ddd'},c.inRng&&{color:OR},(c.isSt||c.isEn)&&{color:'#fff',fontWeight:'800'}]}>{c.dayNum}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{flexDirection:'row',backgroundColor:'#f8f8f8',borderRadius:14,padding:14,marginTop:14,gap:12}}>
            <View style={{flex:1,alignItems:'center'}}>
              <Text style={{fontSize:11,color:'#aaa',marginBottom:4}}>Baslangic</Text>
              <Text style={{fontSize:16,fontWeight:'800',color:start?OR:'#ddd'}}>{fmt2(start)}</Text>
            </View>
            <View style={{width:1,backgroundColor:'#e5e5e5'}}/>
            <View style={{flex:1,alignItems:'center'}}>
              <Text style={{fontSize:11,color:'#aaa',marginBottom:4}}>Bitis</Text>
              <Text style={{fontSize:16,fontWeight:'800',color:end?OR:'#ddd'}}>{fmt2(end)}</Text>
            </View>
          </View>
          <Text style={{textAlign:'center',color:'#bbb',fontSize:12,marginTop:10}}>
            {picking==='start'?'📅 Baslangic tarihini secin':'📅 Bitis tarihini secin'}
          </Text>
          <TouchableOpacity style={[s.btn,{marginTop:14,opacity:start&&end?1:0.3}]} onPress={()=>start&&end&&onApply(start,end)} disabled={!start||!end}>
            <Text style={s.btnTxt}>Filtrele  →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{paddingVertical:14,alignItems:'center'}}>
            <Text style={{color:'#aaa',fontSize:14}}>Iptal</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex:{flex:1},
  loginTop:{backgroundColor:DARK,paddingTop:64,paddingBottom:48,alignItems:'center'},
  loginLogo:{width:80,height:80,borderRadius:24,backgroundColor:OR,alignItems:'center',justifyContent:'center',marginBottom:14,shadowColor:OR,shadowOpacity:0.5,shadowRadius:14,elevation:10},
  loginBrand:{fontSize:30,fontWeight:'900',color:'#fff',letterSpacing:0.5},
  loginSub:{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:4},
  loginCard:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:28,flex:1,marginTop:-20},
  lbl:{fontSize:13,fontWeight:'700',color:'#666',marginBottom:7},
  inp:{borderWidth:1.5,borderColor:'#eee',borderRadius:12,padding:14,fontSize:15,marginBottom:16,backgroundColor:'#fafafa',color:DARK},
  btn:{backgroundColor:OR,borderRadius:14,padding:16,alignItems:'center',shadowColor:OR,shadowOpacity:0.35,shadowRadius:10,elevation:5},
  btnTxt:{color:'#fff',fontSize:15,fontWeight:'800',letterSpacing:0.3},
  errBox:{backgroundColor:'#fef2f2',borderWidth:1,borderColor:'#fca5a5',borderRadius:10,padding:12,marginBottom:14},
  errTxt:{fontSize:13,color:RED},
  hdr:{padding:14,flexDirection:'row',alignItems:'center'},
  hdrTitle:{fontSize:17,fontWeight:'800',flex:1},
  brItem:{backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:3},
  brIco:{width:50,height:50,borderRadius:14,alignItems:'center',justifyContent:'center'},
  arrowBadge:{width:30,height:30,borderRadius:10,backgroundColor:OR2,alignItems:'center',justifyContent:'center'},
  dashHero:{backgroundColor:DARK,paddingHorizontal:16,paddingVertical:16},
  dashHeroRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  heroBtnBox:{backgroundColor:'rgba(255,255,255,.1)',borderRadius:10,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,.12)'},
  heroBtnTxt:{color:'#fff',fontSize:12,fontWeight:'600'},
  filterBar:{backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#efefef',flexGrow:0},
  fbtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,borderWidth:1.5,borderColor:'#e5e5e5',backgroundColor:'#fff'},
  fbtnOn:{backgroundColor:OR,borderColor:OR},
  fbtnTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  fbtnTxtOn:{color:'#fff'},
  statCard:{backgroundColor:'#fff',borderRadius:16,padding:14,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  statLbl:{fontSize:11,color:'#aaa',marginBottom:4,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.3},
  statVal:{fontSize:20,fontWeight:'800',color:DARK},
  statSub:{fontSize:11,color:'#bbb',marginTop:3},
  listCard:{backgroundColor:'#fff',borderRadius:16,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  secTitle:{fontSize:15,fontWeight:'800',color:DARK,paddingBottom:8,paddingTop:4},
  tRow:{flexDirection:'row',alignItems:'center',padding:12,borderBottomColor:'#f8f8f8',borderBottomWidth:1},
  pcBadge:{borderRadius:8,paddingHorizontal:8,paddingVertical:3},
  dotBadge:{width:10,height:10,borderRadius:5,marginRight:10},
  rankBadge:{borderRadius:8,paddingHorizontal:7,paddingVertical:3,marginRight:8},
  rlink:{backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  rlinkIco:{width:46,height:46,borderRadius:13,alignItems:'center',justifyContent:'center'},
  moreBtn:{borderWidth:2,borderColor:OR,borderRadius:14,padding:14,alignItems:'center',marginTop:6,backgroundColor:OR2},
  nav:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#efefef',paddingTop:8},
  navItem:{flex:1,alignItems:'center',gap:3},
  navIcoBg:{width:38,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'},
  navIcoBgOn:{backgroundColor:OR2},
  navLbl:{fontSize:10,fontWeight:'600',color:'#bbb'},
  empty:{textAlign:'center',color:'#bbb',fontSize:14,paddingVertical:16},
});
