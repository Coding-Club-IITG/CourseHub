import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_web_auth/flutter_web_auth.dart';


import '../../constants/endpoints.dart';
import '../../database/hive_store.dart';
import '../../models/user.dart';
import '../../screens/login_screen.dart';
import '../contributions/contribution.dart';
import '../courses/get_courses.dart';
import '../protected.dart';
import '../user/user.dart';

Future<void> authenticate() async {
  try {
    final result = await FlutterWebAuth.authenticate(
        url: AuthEndpoints.getAccess, callbackUrlScheme: "coursehub");

    final prefs = await SharedPreferences.getInstance();
    var accessToken = Uri.parse(result).queryParameters['token'];
    if (accessToken == null) {
      throw ('access token not in query params');
    }

    prefs.setString('access_token', accessToken);
    await getCurrentUser();
    await getContribution();
    await setHiveStore();

    final user = User.fromJson(HiveStore.userData);
    for (var i = 0; i < user.courses.length; i++) {
      await getUserCourses(user.courses[i].code);
    }
    await setHiveStore();
  } on PlatformException catch (_) {
    rethrow;
  } catch (e) {
    rethrow;
  }
}

Future<void> logoutHandler(context) async {
  final prefs = await SharedPreferences.getInstance();
  prefs.clear();

  final box = await Hive.openBox('coursehub-data');
  box.clear();

  Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (context) => const LoginScreen(),
      ),
      (route) => false);
}

Future<bool> isLoggedIn() async {
  var access = await getAccessToken();

  if (access != 'error') {
    await setHiveStore();
    return true;
  } else {
    return false;
  }
}

Future<void> setHiveStore() async {
  final box = await Hive.openBox('coursehub-data');
  HiveStore.userData = box.get('user') ?? {};
  HiveStore.contribution = box.get('contribution') ?? [];
  HiveStore.coursesData = box.get('courses-data') ?? {};
}
