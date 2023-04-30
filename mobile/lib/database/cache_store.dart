import 'package:coursehub/database/hive_store.dart';
import 'package:flutter/material.dart';

import 'package:shared_preferences/shared_preferences.dart';

class CacheStore {
  static Map<String, bool> courseAvailability = {};
  static Map<String, Color> courseColor = {};
  static dynamic tempCourseData = {};
  static bool isTempCourse = false;
  static bool isGuest = false;
  static String browsePath = 'Home/';
  static String browseYear = '';

  static clearCacheStore() {
    courseAvailability = {};
    tempCourseData = {};
    courseColor = {};
  }

  static resetBrowsePath() {
    browsePath = 'Home/';
    browseYear = '';
  }

  static Future<String> getBrowsedCourse() async {
    final prefs = await SharedPreferences.getInstance();
    final presentBrowsedCourse = prefs.getString('presentBrowsedCourse') ??
        HiveStore.getUserDetails().courses[0].code;
    return presentBrowsedCourse;
  }

  static saveBrowsedCourse(String code) async {
    final prefs = await SharedPreferences.getInstance();
    prefs.setString('presentBrowsedCourse', code);
  }
}
