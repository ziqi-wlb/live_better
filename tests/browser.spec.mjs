import {test,expect} from '@playwright/test';
test('mobile browse, filter, detail, save and login',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('http://127.0.0.1:5173');
 // 条数由数据决定，别把具体数字写进断言
 await expect(page.getByText(/34 个章节 · \d+ 条真实建议/)).toBeVisible();
 await page.locator('.search input').fill('戒烟');
 await page.getByText('搜索',{exact:true}).click();
 await expect(page.getByText(/条结果/)).toContainText('条结果');
 await page.locator('.card-title').first().click();
 await expect(page.getByText('完整收益与研究条件',{exact:true})).toBeVisible();
 await page.getByText('☆ 收藏',{exact:true}).click();
 await expect(page.getByText('取消收藏',{exact:true})).toBeVisible();
 await page.getByText('我的清单',{exact:true}).click();
 await expect(page.locator('.card-title')).toHaveCount(1);
 await page.getByText('我的',{exact:true}).click();
 await page.getByText('我已阅读并同意以上隐私说明').click();
 await page.getByText('开发登录并合并访客记录',{exact:true}).click();
 await expect(page.getByText('本地开发账号',{exact:true})).toBeVisible();
 await page.getByText('我的清单',{exact:true}).click();
 await expect(page.locator('.card-title')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'docs/mobile-preview.png',fullPage:true});
 await page.getByText('发现',{exact:true}).click();
 await page.setViewportSize({width:1280,height:900});
 await page.screenshot({path:'docs/desktop-preview.png',fullPage:true});
});
