import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_web_auth/flutter_web_auth.dart';
import 'package:http/http.dart' as http;

import '../../constants/endpoints.dart';
import '../../database/cache_store.dart';

import '../../database/hive_store.dart';
import '../../models/user.dart';
import '../../screens/login_screen.dart';
import '../contributions/contribution.dart';
import '../courses/add_courses.dart';
import '../protected.dart';
import '../user/user.dart';

Future<void> authenticate({bool isGuest = false}) async {
  try {
    final String? accessToken;
    if (isGuest) {
      final result =
      await http.get(Uri.parse(MiscellaneousEndpoints.guestLogin));
      accessToken = jsonDecode(result.body)['token'];
    } else {
      final result = await FlutterWebAuth.authenticate(
          url: AuthEndpoints.getAccess, callbackUrlScheme: "coursehub");
      accessToken = Uri.parse(result).queryParameters['token'];
    }
    final prefs = await SharedPreferences.getInstance();

    if (accessToken == null) {
      throw ('access token not found');
    }

    prefs.setString('access_token', accessToken);
    prefs.setBool('isGuest', isGuest);
    CacheStore.isGuest = isGuest;
    await getCurrentUser();
    await getContribution();
    await setHiveStore();

    final user = User.fromJson(HiveStore.userData);

    List<Future> concurrentTasks = [];
    for (var i = 0; i < user.courses.length; i++) {
      concurrentTasks.add(getUserCourses(user.courses[i].code));
    }
// parallel API calls to decrease time by GeekyPS
    await Future.wait(concurrentTasks);
    await prefs.setString('fetchDate', DateTime.now().toString());
    await setHiveStore();
  } on PlatformException catch (_) {
    rethrow;
  } catch (e) {
    rethrow;
  }
}

Future<void> logoutHandler(context) async {
  final prefs = await SharedPreferences.getInstance();
  final box = await Hive.openBox('coursehub-data');

  prefs.clear();
  box.clear();
  HiveStore.clearHiveData();
  CacheStore.clearCacheStore();

  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(
      builder: (context) => const LoginScreen(),
    ),
        (route) => false,
  );
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
