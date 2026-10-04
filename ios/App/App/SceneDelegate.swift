import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SemestraViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The app's native frame around the web view:
/// - Capacitor switches the iOS rubber-band bounce off. Semestra turns it back on (up and down only), so scrolling to
///   the top or bottom of a page eases out like in other iPhone apps instead of stopping dead.
/// - What the bounce reveals is drawn here, not by the page, so it takes the page colour of light or dark mode
///   (--page in legacy.css).
/// - The app's own theme setting (light, dark or like the iPhone) arrives as a "theme" message from src/native.ts and
///   is applied to the whole window, so the bounce area and the status bar follow it too.
class SemestraViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private static let page = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x15 / 255, green: 0x18 / 255, blue: 0x21 / 255, alpha: 1)
            : UIColor(red: 0xF7 / 255, green: 0xF6 / 255, blue: 0xFB / 255, alpha: 1)
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }
        webView.backgroundColor = Self.page
        webView.scrollView.backgroundColor = Self.page
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.alwaysBounceHorizontal = false
        webView.configuration.userContentController.add(self, name: "theme")
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "theme", let theme = message.body as? String else { return }
        view.window?.overrideUserInterfaceStyle = theme == "dark" ? .dark : theme == "light" ? .light : .unspecified
    }
}
