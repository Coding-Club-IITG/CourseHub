import 'dart:convert';


import 'package:coursehub/apis/courses/add_courses.dart';
import 'package:coursehub/apis/protected.dart';
import 'package:coursehub/apis/user/user.dart';
import 'package:coursehub/constants/endpoints.dart';
import 'package:coursehub/models/course.dart';
import 'package:coursehub/models/user.dart';

import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

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


    if (response['updated']) {
      List updatedCourses = response['updatedCourses'];

      for (var course in updatedCourses) {
        await getUserCourses(course);
      }
    }

    List<Course> subscribedCourses = (response['subscribedCourses'] as List)
        .map((e) => Course.fromJson(e))
        .toList();

    var box = await Hive.openBox('coursehub-data');

    User user = User.fromJson(box.get('user') ?? {});
    List<Course> toBeAdded = [];

    for (var course in subscribedCourses) {
      if (!user.courses.any((element) => element.code == course.code)) {
        toBeAdded.add(course);
      }
    }

    for (var element in toBeAdded) {
      await getUserCourses(element.code);
    }

    await getCurrentUser();
  } catch (e) {
    print(e.toString());
  }
}
