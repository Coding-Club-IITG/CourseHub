import 'dart:convert';

import 'package:coursehub/apis/protected.dart';
import 'package:coursehub/constants/endpoints.dart';
import 'package:coursehub/utilities/set_hive_store.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

import 'add_courses.dart';

Future<void> isCourseUpdated() async {
  try {
    final prefs = await SharedPreferences.getInstance();

    final header = await getAccessToken();

    if (header == 'error') {
      return;
    }

    final fetchDate = prefs.getString('fetchDate') ?? "2019-04-28T14:45:15";

    final res = await http.post(
      Uri.parse(CoursesEndpoints.isCourseUpdated),
      body: jsonEncode(
        {"clientOn": fetchDate},
      ),
      headers: {'Authorization': header, 'content-type': 'application/json'},
    );

    final response = jsonDecode(res.body);

    if (!response['updated']) {
      return;
    } else {
      List<dynamic> courses = response['data'];

      for (var course in courses) {
        await getUserCourses(course);
      }

      await setHiveStore();
    }
  } catch (e) {
    print(e);
  }
}
