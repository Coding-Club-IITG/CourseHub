import 'dart:convert';

import 'package:coursehub/database/hive_store.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;

import '../../apis/protected.dart';
import '../../apis/user/user.dart';
import '../../database/cache_store.dart';

import '../../constants/endpoints.dart';

Future<void> getUserCourses(String code, {bool isTempCourse = false}) async {
  try {
    final response =
        await http.get(Uri.parse('${CoursesEndpoints.course}$code/'));

    var decodedResponse = jsonDecode(response.body);

    if (isTempCourse) {
      CacheStore.tempCourseData = decodedResponse;

      return;
    }

    var box = await Hive.openBox('coursehub-data');
    Map<dynamic, dynamic> data = box.get('courses-data') ?? {};
    if (decodedResponse['found'] == true) {
      data[code.toLowerCase()] = decodedResponse;
    } else {
      data[code.toLowerCase()] = 'unavailable';
    }
    box.put('courses-data', data);
  } catch (e) {
    rethrow;
  }
}

Future<void> addUserCourses(String code, String courseName) async {
  final token = await getAccessToken();

  try {
    await http.post(
      Uri.parse(CoursesEndpoints.addCourse),
      body: jsonEncode(
        {'code': code, 'name': courseName.toLowerCase()},
      ),
      headers: {'Authorization': token, 'content-type': 'application/json'},
    );
    await getCurrentUser();
    await getUserCourses(code);
    await setHiveStore();
  } catch (e) {
    rethrow;
  }
}
