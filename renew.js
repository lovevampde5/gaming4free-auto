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
    console.log("🚀 启动浏览器 (已延长超时时间至 2 分钟)...");
    const busterPath = path.join(__dirname, 'extensions', 'buster', 'unpacked');
    
    let context;
    let targetPage;

    try {
        // 增加启动超时时间，防止 GitHub 免费服务器性能拉垮导致崩溃
        context = await chromium.launchPersistentContext('', {
            headless: false,
            timeout: 120000, 
            args: [
                `--disable-extensions-except=${busterPath}`,
                `--load-extension=${busterPath}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-dev-shm-usage',
                '--window-size=1280,960'
            ],
            ignoreDefaultArgs: ["--mute-audio"],
        });

        const page = await context.newPage();
        targetPage = page;

        console.log("🌐 1. 访问前台登录页...");
        await targetPage.goto('https://gaming4free.net/login', { waitUntil: 'networkidle', timeout: 60000 });

        console.log("🔑 输入前台账号密码...");
        await targetPage.locator('input[type="email"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: 'Sign In' }).click();

        await targetPage.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
        await targetPage.waitForLoadState('networkidle');

        // 处理前台弹窗
        console.log("🔍 检查前台新手引导弹窗...");
        try {
            const skipBtn = targetPage.getByText('Skip', { exact: true });
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
            await targetPage.waitForTimeout(1000); 
        } catch (error) {}

        console.log("🎛️ 2. 点击 Panel 准备进入后台...");
        const panelPromise = context.waitForEvent('page').catch(() => null);
        await targetPage.locator('a[target="_blank"]').last().click({ force: true });
        
        const newPage = await panelPromise;
        if (newPage) {
            targetPage = newPage;
            await targetPage.waitForLoadState('domcontentloaded');
        }

        // ==========================================
        // 🌟 新增：处理后端二次登录与 reCAPTCHA
        // ==========================================
        console.log("🔒 3. 到达后台登录页，执行二次登录...");
        // 填写后台账号密码
        await targetPage.locator('input[type="email"], input[name="username"]').fill(MC_USERNAME);
        await targetPage.locator('input[type="password"]').fill(MC_PASSWORD);
        await targetPage.getByRole('button', { name: /LOGIN|登录/i }).click();

        console.log("🤖 检查是否弹出 reCAPTCHA 人机验证...");
        await targetPage.waitForTimeout(3000); // 给验证码一点时间弹出来
        
        try {
            // 寻找包含图片的那个挑战框 iframe (bframe)
            const challengeFrame = targetPage.frameLocator('iframe[src*="recaptcha/api2/bframe"]');
            // 寻找 Buster 插件注入的橙色小人语音破解按钮
            const solverBtn = challengeFrame.locator('#solver-button');
            
            if (await solverBtn.isVisible({ timeout: 5000 })) {
                console.log("🎧 发现验证码！正在呼叫 Buster 插件进行语音破解...");
                await solverBtn.click({ force: true });
                // 给 Buster 15 秒钟时间去听音频并填写验证码
                await targetPage.waitForTimeout(15000);
                console.log("✅ 验证码破解可能已完成。");
                
                // 如果破解完没有自动跳转，再点一次登录按钮
                const loginBtn = targetPage.getByRole('button', { name: /LOGIN|登录/i });
                if (await loginBtn.isVisible({ timeout: 2000 })) {
                    await loginBtn.click({ force: true });
                }
            }
        } catch (e) {
            console.log("✅ 无需验证码或验证码已自动通过。");
        }

        // ==========================================
        // 🌟 新增：在 Server List 中点击你的服务器
        // ==========================================
        console.log("🖥️ 4. 正在寻找服务器列表...");
        // 等待页面跳转到带有服务器列表的后台首页
        await targetPage.waitForLoadState('networkidle');
        await targetPage.waitForTimeout(3000);

        console.log("👆 点击你的服务器 (My renqi)...");
        // 根据你截图中的服务器名字点击，如果你的服务器改名了，请修改下面括号里的名字！
        const serverBlock = targetPage.getByText('My renqi', { exact: false }).first();
        await serverBlock.waitFor({ state: 'visible', timeout: 15000 });
        await serverBlock.click({ force: true });
        
        // 等待进入服务器控制台主页
        await targetPage.waitForLoadState('networkidle');

        // ==========================================
        // 恢复原有流程：点击 Console 和加时间
        // ==========================================
        console.log("💻 5. 进入 Console 面板...");
        await targetPage.getByText('Console', { exact: true }).click();
        await targetPage.waitForLoadState('networkidle');

        console.log("⏳ 正在寻找并点击 ADD 90 MINUTES...");
        const addTimeBtn = targetPage.getByRole('button', { name: /ADD 90 MINUTES/i });
        await addTimeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await addTimeBtn.click({ force: true });

        // 终极广告清理循环
        console.log("📺 6. 开启广告清障模式，等待续期生效...");
        let success = false;
        for (let i = 0; i < 60; i++) {
            await targetPage.waitForTimeout(5000);
            await targetPage.keyboard.press('Escape').catch(() => {});
            try {
                const closeBtn = targetPage.locator('button[aria-label*="lose" i], [class*="close" i], svg.lucide-x').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    await closeBtn.click({ force: true });
                }
            } catch (e) {}

            try {
                const waitBtn = targetPage.getByRole('button', { name: /PLEASE WAIT/i });
                if (await waitBtn.isVisible({ timeout: 1000 })) {
                    success = true;
                    console.log("✅ 成功回到控制台，已进入 PLEASE WAIT 续期等待状态！");
                    break;
                }
            } catch (e) {}
        }

        if (!success) {
            throw new Error("🚨 广告结束超时，未能跳回控制台。");
        }

        console.log("🎉 续期全流程顺利完成！");
        await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        if (targetPage) {
            try {
                const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
                await targetPage.screenshot({ path: screenshotPath });
                console.log("📸 已保存案发现场截图！");
            } catch (e) {}
        }
        await sendTelegramMessage(`⚠️ 续期脚本崩溃！\n账号: ${MC_USERNAME}\n报错: ${error.message.substring(0, 100)}...`);
        process.exit(1);
    } finally {
        if (context) await context.close();
        console.log("🛑 脚本运行结束。");
    }
})();
