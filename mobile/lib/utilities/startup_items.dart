import 'package:coursehub/apis/notifications/firebase_api.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_dynamic_links/firebase_dynamic_links.dart';
import 'package:flutter/cupertino.dart';
import 'package:hive_flutter/adapters.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../apis/user/user.dart';
import '../database/cache_store.dart';
import '../database/hive_store.dart';
import './dynamic_links.dart';

Future<void> startupItems () async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await Hive.initFlutter();

  // share links
  await FirebaseDynamicLink.handleInitialLink();
  await FirebaseDynamicLinks.instance.getInitialLink();

  // notifications

  await FirebaseApi().initNotification();

  try {
    await getCurrentUser();
  } catch (e) {
    final prefs = await SharedPreferences.getInstance();
    final box = await Hive.openBox('coursehub-data');
    prefs.clear();
    box.clear();
    HiveStore.clearHiveData();
    CacheStore.clearCacheStore();
  }

}