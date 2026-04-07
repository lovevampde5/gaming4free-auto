const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 💡 配置项：优先读取环境变量 (GitHub Secrets)，如果没有则使用后面写死的默认值
const USERNAME = process.env.USERNAME || 'peng320829@gmail.com';
const PASSWORD = process.env.PASSWORD || 'Qwer12138@';
const TG_TOKEN = process.env.TG_TOKEN || '8490493179:AAG1Q5pkFNkUzR2E5pSm8OpJa_SPZNf32Mw';
const TG_CHAT = process.env.TG_CHAT || '6499138234';

// TG 消息推送函数
async function sendTG(message) {
    if (!TG_TOKEN || !TG_CHAT) return;
    try {
        const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text: `🤖 Gaming4Free Auto:\n${message}` })
        });
        console.log("📨 TG 通知发送成功");
    } catch (e) {
        console.error("❌ TG 通知发送失败:", e.message);
    }
}

// Buster 插件解压后的绝对路径
const extensionPath = path.resolve(__dirname, 'extensions/buster/unpacked');

(async () => {
    console.log(`\n===== RUN AUTOMATION =====`);
    console.log(`👤 尝试登录账号: ${USERNAME}`);

    const browserContext = await chromium.launchPersistentContext('', {
        headless: false, // 必须 false，配合 actions 的 xvfb 虚拟屏幕运行
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });

    const page = await browserContext.newPage();
    console.log("🧩 Buster 插件已挂载");

    try {
        // 1. 访问登录页
        await page.goto('https://panel.gaming4free.net/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: path.join(__dirname, `screenshots/1_open.png`) });

        // 2. 填写账号密码 (使用更强大的兼容性定位器)
        // 查找 name 属性为 username 或普通文本输入框
        const userField = page.locator('input[name="username"], input[name="email"], input[type="text"]').first();
        // 显式等待输入框出现，最多等 15 秒
        await userField.waitFor({ state: 'visible', timeout: 15000 }); 
        await userField.fill(USERNAME);

        const passField = page.locator('input[name="password"], input[type="password"]').first();
        await passField.fill(PASSWORD);
        console.log("✍️ 账号密码已填充");

        // 3. 点击登录按钮
        await page.getByRole('button', { name: /login/i }).click();
        
        // 4. 等待验证码弹窗出现
        console.log("🤖 正在检测 reCAPTCHA 挑战...");
        await page.waitForTimeout(3000); // 留出时间让 iframe 弹出来
        
        // 定位 reCAPTCHA 弹窗的 iframe (包含九宫格和 Buster 按钮的 iframe)
        const bframe = page.frameLocator('iframe[src*="recaptcha/api2/bframe"]');
        
        // 检查是否弹出了验证码
        if (await bframe.locator('#recaptcha-audio-button').isVisible().catch(()=>false)) {
            console.log("🔄 检测到验证码，准备使用 Buster...");
            
            // 点击切换到音频验证 (Buster 会自动接管)
            await bframe.locator('#recaptcha-audio-button').click();
            await page.waitForTimeout(1000);
            
            console.log("🖱️ 点击 Buster 破解按钮");
            // 点击 Buster 注入的橙色小人/播放按钮
            await bframe.locator('.help-button-holder').click();
            
            // 等待验证完成的标志
            await page.waitForTimeout(8000); 
            console.log("✅ 验证码处理完成");
            await page.screenshot({ path: path.join(__dirname, `screenshots/2_captcha_solved.png`) });
            
            // 再次点击登录 (如果验证码完成后没有自动跳转)
            if (await page.getByRole('button', { name: /login/i }).isVisible().catch(()=>false)) {
                 await page.getByRole('button', { name: /login/i }).click();
            }
        } else {
            console.log("⏩ 未弹出验证码，直接进入下一步");
        }

        // 5. 等待页面跳转（登录成功或进入控制台面板）
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(__dirname, `screenshots/3_done.png`) });
        
        // 根据页面 URL 判断是否成功 (你可能需要根据实际控制台地址微调)
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
            throw new Error('登录失败，仍然停留在登录页，请查看截图');
        }

        console.log("🚀 续期/登录成功!");
        await sendTG(`✅ 账号 ${USERNAME} 续期/登录成功！\n时间: ${new Date().toLocaleString()}`);

    } catch (error) {
        console.error("❌ 发生错误:", error);
        await page.screenshot({ path: path.join(__dirname, `screenshots/error.png`) });
        await sendTG(`❌ 账号 ${USERNAME} 续期失败！\n错误信息: ${error.message}`);
    } finally {
        await browserContext.close();
    }
})();
