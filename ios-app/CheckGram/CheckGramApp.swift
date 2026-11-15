import SwiftUI
import WebKit

private let appURL = URL(string: "https://timur850.github.io/telegram-tt/")!
private let appHost = "timur850.github.io"

@main
struct CheckGramApp: App {
    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea(.container, edges: .bottom)
                .background(Color(.systemBackground))
        }
    }
}

struct WebContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Bridge for the web app: `window.webkit.messageHandlers.checkgram.postMessage(...)`
        config.userContentController.add(context.coordinator, name: "checkgram")
        config.userContentController.addUserScript(WKUserScript(
            source: "window.checkGramNative = { version: 1, icon: \(Coordinator.currentIconJSON()) };",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // App-bound domains let the site's service worker run inside the app
        config.limitsNavigationsToAppBoundDomains = true

        let webView = WKWebView(frame: .zero, configuration: config)
        context.coordinator.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground

        webView.load(URLRequest(url: appURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?

        static func currentIconJSON() -> String {
            let name = UIApplication.shared.alternateIconName?.replacingOccurrences(of: "AppIcon-", with: "") ?? "Default"
            return "\"\(name)\""
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }

            if type == "setIcon" {
                let name = body["name"] as? String ?? "Default"
                let iconName = name == "Default" ? nil : "AppIcon-\(name)"
                guard UIApplication.shared.supportsAlternateIcons else { return }

                UIApplication.shared.setAlternateIconName(iconName) { [weak self] error in
                    let result = error == nil ? Coordinator.currentIconJSON() : "null"
                    DispatchQueue.main.async {
                        self?.webView?.evaluateJavaScript(
                            "window.checkGramNative.icon = \(result); window.dispatchEvent(new Event('checkgramicon'));"
                        )
                    }
                }
            }
        }

        // Links to other sites open in Safari instead of replacing the app
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.allow) }
            let isAppPage = url.host == appHost || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data"
            if isAppPage {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }

        // `target=_blank` links
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url { UIApplication.shared.open(url) }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert), actions: [
                UIAlertAction(title: "OK", style: .default) { _ in completionHandler() },
            ])
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert), actions: [
                UIAlertAction(title: "Отмена", style: .cancel) { _ in completionHandler(false) },
                UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) },
            ])
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                     defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping (String?) -> Void) {
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            present(alert, actions: [
                UIAlertAction(title: "Отмена", style: .cancel) { _ in completionHandler(nil) },
                UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) },
            ])
        }

        private func present(_ alert: UIAlertController, actions: [UIAlertAction]) {
            actions.forEach(alert.addAction)
            let root = UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.keyWindow }
                .first?.rootViewController
            root?.present(alert, animated: true)
        }
    }
}
