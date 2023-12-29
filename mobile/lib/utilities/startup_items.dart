import 'package:coursehub/apis/authentication/login.dart';
import 'package:coursehub/apis/courses/is_course_updated.dart';
import 'package:coursehub/apis/miscellaneous/funfacts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_dynamic_links/firebase_dynamic_links.dart';
import 'package:hive_flutter/adapters.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../apis/user/user.dart';
import '../database/cache_store.dart';
import '../database/hive_store.dart';
import './dynamic_links.dart';

Future<bool> startupItems() async {
  try {
    // intializing everything
    await Future.wait([
      Firebase.initializeApp(),
      Hive.initFlutter(),
    ]);

      await Future.wait([
      //share links
      FirebaseDynamicLink.handleInitialLink(),
      FirebaseDynamicLinks.instance.getInitialLink(),

      // fetch userData
      getCurrentUser(),

      //fetch fun facts
      getFunFacts(fetchAgain: true),

    ]);

    final prefs = await SharedPreferences.getInstance();
    final loggedIn = await isLoggedIn();

    await isCourseUpdated();
    CacheStore.isGuest = prefs.getBool('isGuest') ?? false;
    return loggedIn;
  } catch (e) {
    // logout if error

    final prefs = await SharedPreferences.getInstance();
    final box = await Hive.openBox('coursehub-data');
    prefs.clear();
    box.clear();
    HiveStore.clearHiveData();
    CacheStore.clearCacheStore();

    // not logged in
    return false;
  }
}
