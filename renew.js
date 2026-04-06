// 🌟 引入隐身增强版 Playwright
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth); 

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// ==========================================
// ✅ 账号信息和 TG 机器人信息
// ==========================================
const MC_USERNAME = 'peng320829@gmail.com';
const MC_PASSWORD = 'Qwer12138@'; 
const TG_BOT_TOKEN = '8490493179:AAG1Q5pkFNkUzR2E5pSm8OpJa_SPZNf32Mw'; 
const TG_CHAT_ID = '6499138234';     
// ==========================================

async function sendTelegramMessage(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID || TG_BOT_TOKEN.includes('填入你的')) return;
    const now = new Date();
    const beijingHour = new Date(now.getTime() + 8 * 3600 * 1000).getUTCHours();
    
    if (beijingHour !== 12) {
        console.log(`🔕 [通知静音] 当前北京时间 ${beijingHour} 点。按规则仅在每天中午 12 点发报。`);
        return;
    }
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text })
        });
    } catch (e) {}
}

async function autoSolveCaptcha(page) {
    try {
        const frames = page.frames();
        for (const frame of frames) {
            if (frame.url().includes('bframe') || frame.url().includes('fallback')) {
                
                const errorLocator = frame.locator('.rc-doscaptcha-header-text');
                const solverBtn = frame.locator('#solver-button').first();
                const audioBtn = frame.locator('#recaptcha-audio-button').first();

                if (await errorLocator.count() > 0 && await errorLocator.isVisible({timeout: 500}).catch(()=>false)) {
                    if ((await errorLocator.innerText()).includes('Try again later')) return 'blocked';
                }

                if (await solverBtn.count() > 0) {
                    console.log("  [透视雷达] 🤖 发现 Buster！使用真鼠点击...");
                    await solverBtn.click({ force: true });
                    await page.waitForTimeout(15000);
                    return 'solved';
                }

                if (await audioBtn.count() > 0) {
                    console.log("  [透视雷达] ⚠️ 发现耳机！使用真鼠点击切入语音...");
                    await audioBtn.click({ force: true });
                    await page.waitForTimeout(2500); 

                    if (await errorLocator.count() > 0 && await errorLocator.isVisible({timeout: 500}).catch(()=>false)) {
                        if ((await errorLocator.innerText()).includes('Try again later')) return 'blocked';
                    }

                    if (await solverBtn.count() > 0) {
                        console.log("  [透视雷达] 🤖 语音模式就绪，点击 Buster...");
                        await solverBtn.click({ force: true });
                        await page.waitForTimeout(15000);
                        return 'solved';
                    }
                }
            }
        }
    } catch (e) {}
    return 'none';
}

(async () => {
    console.log("==========================================");
    console.log("🚀 [步骤 0] 脚本启动，环境自检...");
    
    const busterPath = path.join(os.tmpdir(), 'buster-extension');
    if (!fs.existsSync(path.join(busterPath, 'manifest.json'))) {
        try {
            fs.mkdirSync(busterPath, { recursive: true });
            const releaseJson = execSync('curl -sL https://api.github.com/repos/dessant/buster/releases/latest').toString();
            const downloadUrl = JSON.parse(releaseJson).assets.find(a => a.name.includes('chrome')).browser_download_url;
            execSync(`curl -L -o /tmp/buster.zip "${downloadUrl}"`);
            execSync(`unzip -q -o /tmp/buster.zip -d ${busterPath}`);
        } catch (e) {}
    }

    const manifestPath = path.join(busterPath, 'manifest.json');
    try {
        let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.manifest_version === 3 && manifest.action && !manifest.browser_action) {
            manifest.browser_action = manifest.action;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        }
    } catch (e) {}

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

    let globalSuccess = false;

    for (let currentRun = 1; currentRun <= 3; currentRun++) {
        console.log(`\n🌀 === [第 ${currentRun}/3 次盲盒抽卡开始] === 🌀`);
        let context;
        
        try {
            console.log("🔥 点火启动浏览器 (挂载动态家宽)...");
            context = await chromium.launchPersistentContext('', {
                headless: false, 
                timeout: 120000, 
                proxy: { server: 'socks5://127.0.0.1:10808' }, 
                args: [
                    '--headless=new', 
                    `--disable-extensions-except=${busterPath}`,
                    `--load-extension=${busterPath}`,
                    '--disable-web-security', '--disable-site-isolation-trials',
                    '--no-sandbox', '--disable-gpu', '--window-size=1920,1080', 
                    '--disable-blink-features=AutomationControlled',
                    '--enforce-webrtc-ip-permission-check',
                    '--force-webrtc-ip-handling-policy=disable-non-proxied-udp'
                ],
                ignoreDefaultArgs: ["--mute-audio", "--enable-automation"], 
            });

            const ipPage = await context.newPage();
            try {
                await ipPage.goto('https://api.ipify.org', { timeout: 15000 });
                console.log(`🌍 [盲盒鉴定] 本次分配到的全局出口 IP 为: ${await ipPage.innerText('body')}`);
            } catch(e) {} finally { await ipPage.close(); }

            const targetPage = await context.newPage();
            console.log("🌐 直达核心 Panel 面板 (等待家宽慢速加载)...");
            await targetPage.goto('https://panel.gaming4free.net', { waitUntil: 'domcontentloaded', timeout: 90000 });

            const pwdInput = targetPage.locator('input[type="password"]').first();
            const serverLabel = targetPage.getByText('My renqi', { exact: false }).first();

            let pageType = 'none';
            for(let i=0; i<15; i++) {
                if (await pwdInput.isVisible()) { pageType = 'login'; break; }
                if (await serverLabel.isVisible()) { pageType = 'dashboard'; break; }
                await targetPage.waitForTimeout(3000); 
            }

            if (pageType === 'none') {
                console.log("🚨 未加载出有效页面。大概率抽到了断联的死节点。");
                throw new Error("RETRY_NEEDED"); 
            }

            if (pageType === 'login') {
                console.log(`🔑 发现登录框，填入账号...`);
                await targetPage.locator('input:not([type="hidden"]):not([type="password"])').first().fill(MC_USERNAME);
                await pwdInput.fill(MC_PASSWORD);
                
                // ==========================================
                // 🌟 核心升级：见招拆招，动态重试点击登录
                // ==========================================
                let readyToSolve = false;
                for (let clickRetry = 1; clickRetry <= 5; clickRetry++) {
                    console.log(`🟢 [第 ${clickRetry} 次] 点击登录按钮...`);
                    await targetPage.getByRole('button', { name: /LOGIN|登录|Sign In/i }).first().click({ force: true });
                    
                    await targetPage.waitForTimeout(2000);
                    const errorToast = targetPage.getByText('did not render yet', { exact: false });
                    
                    if (await errorToast.isVisible({timeout: 1500}).catch(()=>false)) {
                        console.log("⏳ [前端拦截] 网站报错说底层验证码还没加载完！耐心等 5 秒后再点...");
                        await targetPage.waitForTimeout(5000);
                    } else {
                        console.log("✅ 登录动作被网站受理！盯防验证码...");
                        readyToSolve = true;
                        break;
                    }
                }

                if (!readyToSolve) {
                    console.log("❌ 连续 5 次点击都被前端卡死，可能网络完全断流了。");
                    throw new Error("RETRY_NEEDED");
                }
                // ==========================================

                let loginSuccess = false;
                for (let i = 0; i < 20; i++) { 
                    if (!targetPage.url().includes('auth/login')) {
                        loginSuccess = true;
                        console.log("🎉 验证通过！成功突破大门进入后台！");
                        break;
                    }
                    const capStatus = await autoSolveCaptcha(targetPage);
                    if (capStatus === 'blocked') {
                        console.log("🚨 糟糕！抽到了脏 IP (Try again later)！");
                        throw new Error("RETRY_NEEDED");
                    }
                    await targetPage.waitForTimeout(2000);
                }
                if (!loginSuccess) throw new Error("RETRY_NEEDED");
            }

            console.log("🖥️ 定位并点击 renqi 服务...");
            await targetPage.getByText('My renqi', { exact: false }).filter({ state: 'visible' }).first().click({ force: true });
            await targetPage.waitForLoadState('domcontentloaded');
            await targetPage.waitForTimeout(3000); 
            await targetPage.locator('a').filter({ hasText: /^Console$/i }).first().click({ force: true }); 
            await targetPage.waitForLoadState('domcontentloaded');
            await targetPage.waitForTimeout(3000);

            console.log(`⏳ 准备点击 ADD 90 MINUTES 续期按钮...`);
            try {
                await targetPage.getByRole('button', { name: /ADD 90 MINUTES/i }).waitFor({ state: 'visible', timeout: 10000 });
                await targetPage.getByRole('button', { name: /ADD 90 MINUTES/i }).click({ force: true });
                console.log("✅ 成功点击！静音挂机看广告 (预留 150 秒)...");
            } catch (e) {
                if (await targetPage.getByRole('button', { name: /PLEASE WAIT/i }).isVisible({ timeout: 3000 })) {
                    console.log("ℹ️ 续期冷却中，本次挂机结束。");
                    return; 
                }
            }

            for (let i = 1; i <= 30; i++) {
                await targetPage.waitForTimeout(5000); 
                if (i % 2 === 0) console.log(`  -> 广告播放中... 已等待 ${i * 5} 秒`);
                
                const capStatus = await autoSolveCaptcha(targetPage);
                if (capStatus === 'blocked') {
                    console.log("❌ 验证码环节遭遇脏 IP 拦截！准备转生...");
                    throw new Error("RETRY_NEEDED");
                }
                try {
                    if (await targetPage.getByRole('button', { name: /PLEASE WAIT/i }).isVisible({ timeout: 1000 })) {
                        globalSuccess = true;
                        break;
                    }
                } catch (e) {}
            }

            if (globalSuccess) {
                console.log("🎉🎉 破阵成功！全流程完美收官！");
                await targetPage.screenshot({ path: path.join(screenshotDir, `success_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                await sendTelegramMessage(`🎮 Gaming4Free 续期成功！\n账号: ${MC_USERNAME}\n状态: 已成功领取 90 分钟！`);
                break; 
            } else {
                throw new Error("RETRY_NEEDED");
            }

        } catch (error) {
            console.log(`💥 本次回合宣告失败。原因: ${error.message}`);
            if (context) await context.close();
            
            if (currentRun < 3) {
                console.log(`🔄 销毁当前浏览器，等待 30 秒让动态家宽自动切换新 IP...`);
                await new Promise(resolve => setTimeout(resolve, 30000)); 
            } else {
                console.log("🩸 3 次盲盒全部抽中烂牌或卡死，撤退！等待下一个小时重新运行。");
            }
        } finally {
            if (context) await context.close().catch(()=>{});
        }
    }
})();
