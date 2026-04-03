const { chromium } = require('playwright');
const path = require('path');

const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD; 
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

async function sendTelegramMessage(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
        });
    } catch (e) {
        console.error("TG通知发送失败:", e);
    }
}

(async () => {
    console.log("🚀 启动浏览器...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');

    const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${busterPath}`,
            `--load-extension=${busterPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreDefaultArgs: ["--mute-audio"],
    });

    const page = await context.newPage();
    let targetPage = page;

    try {
        console.log("🌐 访问登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle' });

        // 1. 执行登录
        console.log("🔑 正在输入账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();

        await targetPage.waitForURL('**/dashboard**', { timeout: 20000 })
            .catch(() => console.log("未检测到标准 URL 跳转，继续尝试..."));
        await targetPage.waitForLoadState('networkidle');

        // ==========================================
        // 🌟 优化逻辑：处理随机出现的 Welcome 弹窗
        // ==========================================
        console.log("🔍 检查是否有新手引导弹窗...");
        try {
            // 放宽限制：只要是内容包含 Skip 的元素就尝试点击
            const skipBtn = targetPage.getByText('Skip', { exact: true });
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            console.log("👀 发现新手引导，已点击 Skip 跳过。");
            await targetPage.waitForTimeout(1000); 
        } catch (error) {
            console.log("✅ 5秒内未检测到弹窗，或已被安全忽略，继续执行。");
        }
        // ==========================================

        // 2. 点击 Panel (外部跳转图标)
        console.log("🎛️ 准备进入服务器后台 Panel...");
        const panelPromise = context.waitForEvent('page').catch(() => null);
        
        // 🌟 终极防弹衣：添加 { force: true }，无视任何弹窗强行点击！
        await targetPage.locator('a[target="_blank"]').last().click({ force: true });
        
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
        }

        // 3. 点击 Console
        console.log("💻 正在进入 Console 面板...");
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        // 4. 点击增加时间
        console.log("⏳ 正在寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        // 在这里也加上 force，防止里面也有什么奇奇怪怪的悬浮窗挡着
        await addTimeBtn.click({ force: true });

        // 5. 等待广告读秒结束
        console.log("📺 广告时间... 正在等待状态变更为 PLEASE WAIT...");
        const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
        await waitBtn.waitFor({ state: 'visible', timeout: 300000 });

        console.log("✅ 续期成功！");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        
        const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
        await targetPage.screenshot({ path: screenshotPath });
        
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1);
        
    } finally {
        await context.close();
        console.log("🛑 脚本运行结束。");
    }
})();
