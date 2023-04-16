import 'package:coursehub/database/hive_store.dart';

import 'package:shared_preferences/shared_preferences.dart';

class CacheStore {
  static Map<String, bool> courseAvailability = {};
  static dynamic tempCourseData = {};
  static bool isTempCourse = false;

  static clearCacheStore() {
    courseAvailability = {};
    tempCourseData = {};
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
