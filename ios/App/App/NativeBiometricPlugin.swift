import Foundation
import Capacitor
import LocalAuthentication

@objc(NativeBiometricPlugin)
public class NativeBiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBiometricPlugin"
    public let jsName = "NativeBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        
        var biometryType = 0
        if #available(iOS 11.0, *) {
            switch context.biometryType {
            case .faceID:
                biometryType = 1
            case .touchID:
                biometryType = 2
            default:
                biometryType = 0
            }
        }
        
        call.resolve([
            "isAvailable": available,
            "biometryType": biometryType
        ])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "التحقق من هويتك"
        let useFallback = call.getBool("useFallback") ?? true
        
        let context = LAContext()
        context.localizedFallbackTitle = useFallback ? "استخدام رمز المرور" : ""
        
        let policy: LAPolicy = useFallback
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics
        
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve()
                } else {
                    let errorMessage = error?.localizedDescription ?? "فشل التحقق"
                    call.reject(errorMessage, "AUTH_FAILED")
                }
            }
        }
    }
}
