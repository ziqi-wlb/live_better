// 广告配置。两种形态分开，unit-id 只能配对应形态：
//   插屏广告：代码触发、整屏弹出（已接好，暂不启用——见下）
//   原生模板：<ad-custom> 组件、嵌在页面里（详情页已预留位，id 为空时不渲染）
//
// 插屏暂不启用的原因（2026-11-06 决定）：封面广告已在流量主后台开启，
// 每次启动已被 monetize 一次；叠加插屏后老人每读一条建议要过两道广告，
// 与「少打扰」定位冲突。想启用时把下面填回 'adunit-22938f61eeb31eda'
// 并上传新版本即可，其余代码不用动。
const INTERSTITIAL_UNIT_ID = '';
const NATIVE_TEMPLATE_UNIT_ID = '';

// 微信侧自身有频次控制，这里再加一层：两次弹出至少间隔 60 秒，
// 避免连续翻多条详情时每条都弹。广告任何异常都不能拦住阅读。
const MIN_INTERVAL_MS = 60 * 1000;
let lastShownAt = 0;

// 启动页直接落在详情页（扫预览码停在详情页、点分享卡直进）时，
// 本次会话第一次进详情不弹——「刚启动就弹」违反微信对插屏展示时机的要求。
const launchPath = wx.getLaunchOptionsSync ? wx.getLaunchOptionsSync().path : '';
const enteredViaDetail = typeof launchPath === 'string' && launchPath.indexOf('detail') >= 0;
let detailEntries = 0;

function nativeUnitId() {
  return NATIVE_TEMPLATE_UNIT_ID;
}

function maybeShowInterstitial() {
  if (!INTERSTITIAL_UNIT_ID || !wx.createInterstitialAd) return;
  detailEntries += 1;
  if (enteredViaDetail && detailEntries === 1) return;
  if (Date.now() - lastShownAt < MIN_INTERVAL_MS) return;

  let ad;
  try {
    ad = wx.createInterstitialAd({ adUnitId: INTERSTITIAL_UNIT_ID });
  } catch (err) {
    return;
  }
  if (!ad) return;

  ad.onError((err) => {
    console.log('[ad] 插屏广告出错', err && err.errMsg);
  });
  ad.onClose(() => {
    // 插屏实例展示一次后不能复用，关掉即销毁，下次重新创建
    if (ad && ad.destroy) ad.destroy();
    ad = null;
  });
  // 发起展示时即记录：失败尝试同样占用间隔，避免被频控后高频重试
  lastShownAt = Date.now();
  ad.show().catch((err) => {
    console.log('[ad] 插屏广告显示失败', err && err.errMsg);
    if (ad && ad.destroy) ad.destroy();
  });
}

module.exports = { nativeUnitId, maybeShowInterstitial };
