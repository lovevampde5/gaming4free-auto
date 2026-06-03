import os, sys, time, urllib.request, json
from seleniumbase import SB
# 🌟 引入原生 Selenium 的鼠标物理动作链引擎
from selenium.webdriver.common.action_chains import ActionChains

# ==========================================
# 💡 核心配置 (适配全新 g4f.gg 界面)
# ==========================================
TARGET_URL = "https://g4f.gg/renqi" 
MC_USERNAME = "renqi"

TG_TOKEN = os.getenv("TG_TOKEN", "")
TG_CHAT = os.getenv("TG_CHAT_ID", "")

def send_tg(msg):
    if TG_TOKEN and TG_CHAT:
        try:
            url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
            data = json.dumps({"chat_id": TG_CHAT, "text": f"🤖 G4F 自动续期:\n{msg}"}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        except:
            pass

print(f"\n===== 🚀 开始执行极速续期 (G4F.GG 赛博朋克全新版) =====")

proxy_str = "socks5://127.0.0.1:40000"

with SB(uc=True, proxy=proxy_str, headless=False) as sb:
    try:
        print(f"🌐 正在通过 WARP 访问新版目标网址: {TARGET_URL}")
        sb.open(TARGET_URL)
        
        sb.sleep(6) 
        
        os.makedirs("screenshots", exist_ok=True)
        sb.save_screenshot("screenshots/1_page_loaded.png")

        print("✍️ 尝试填入游戏ID (OPTIONAL)...")
        try:
            sb.type('input[placeholder*="Steve"], input[placeholder*="Player"]', MC_USERNAME, timeout=4)
            print("✅ ID 填入成功！")
        except:
            print("ℹ️ 未找到输入框或无需填入，继续下一步。")

        print("🚀 寻找 [+ ADD 90 MIN] 核心按钮并执行降维打击...")
        
        js_click_code = """
        let clicked = false;
        let els = document.querySelectorAll('button, a, input, div, span');
        for (let i = els.length - 1; i >= 0; i--) {
            let el = els[i];
            let text = (el.innerText || el.value || '').toUpperCase();
            if (text.includes('ADD 90')) {
                el.click();
                clicked = true;
                break;
            }
        }
        return clicked;
        """
        
        is_clicked = sb.execute_script(js_click_code)
        
        if is_clicked:
            print("🖱️ JavaScript 强制穿透点击成功！")
        else:
            print("⚠️ JS 未能点击，尝试备用 XPath 方案...")
            sb.click('xpath=//*[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add 90")]')

        print("⏳ 盲等 6 秒钟，让 CF 盾在静默中完全加载...")
        time.sleep(6) 
        
        try:
            print("🛡️ 彻底抛弃 SeleniumBase 保护机制，调用底层 WebDriver 原生强突！")
            
            # 🌟 核心杀手锏：使用原生 WebDriver 遍历全量 iframe，无视任何 CSS 可见性限制！
            iframes = sb.driver.find_elements("tag name", "iframe")
            cf_found = False
            for iframe in iframes:
                src = iframe.get_attribute("src") or ""
                title = iframe.get_attribute("title") or ""
                
                if "cloudflare" in src.lower() or "turnstile" in src.lower() or "cloudflare" in title.lower():
                    print("🎯 锁定 CF 盾真实底座，执行绝对强行切入...")
                    # 直接传元素切入，不经过任何可视判断！
                    sb.driver.switch_to.frame(iframe)
                    time.sleep(1.5)
                    
                    # 🌟 调取原生 ActionChains，执行最高权限的硬件级鼠标中心盲击！
                    body = sb.driver.find_element("tag name", "body")
                    ActionChains(sb.driver).move_to_element(body).click().perform()
                    
                    print("🖱️ 已对盾内部下达致命的物理射击！等待验证转圈...")
                    cf_found = True
                    time.sleep(6)
                    break
                    
            if not cf_found:
                print("⏩ 未在源码中发现 CF 盾，可能已自动免验证放行。")

        except Exception as e:
            print(f"⏩ 底层盲击模块发生异常 (可忽略): {e}")
        finally:
            try:
                # 无论发生什么，利用原生 API 撤回主页面
                sb.driver.switch_to.default_content()
            except:
                pass

        print("⏳ 等待最终续期结果加载 (等待 6 秒)...")
        time.sleep(6)
        
        try:
            sb.save_screenshot("screenshots/2_result.png")
        except:
            print("⚠️ 截图保存失败。")

        print("✅ 流程执行完毕！")
        send_tg(f"✅ 服务器 [{MC_USERNAME}] 续期脚本运行完毕！\n官方界面已重构，请查阅 GitHub 最新截图确认 CF 盾是否通过以及时间是否增加。")

    except Exception as e:
        print(f"❌ 发生致命错误: {e}")
        try:
            os.makedirs("screenshots", exist_ok=True)
            sb.save_screenshot("screenshots/error.png")
        except:
            pass
        send_tg(f"❌ 自动续期崩溃: {e}")
