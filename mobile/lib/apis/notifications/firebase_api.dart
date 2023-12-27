
import 'package:firebase_messaging/firebase_messaging.dart';


class FirebaseApi {
  final _firebaseMessaging = FirebaseMessaging.instance;
  
  get navigationProvider => null;

  Future<void> initNotification() async {
    await _firebaseMessaging.requestPermission();

    final fcmToken = await _firebaseMessaging.getToken();

    print(fcmToken);
    initPushNotification();
  }

  void handleMessage(RemoteMessage? message) {
    if (message == null) return;
    navigationProvider.changePageNumber(7);
  }

  Future initPushNotification() async {
    FirebaseMessaging.instance.getInitialMessage().then(handleMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(handleMessage);
  }
}
