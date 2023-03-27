import 'dart:convert';

import 'package:http/http.dart' as http;
import '../../constants/endpoints.dart';

Future<dynamic> searchCourse(String coursename) async {
  var courses = coursename.split(' ');

  try {
    final res = await http.post(
      Uri.parse(CoursesEndpoints.search),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode(
        {"words": courses},
      ),
    );
    return jsonDecode(res.body);
  } catch (e) {
    rethrow;
  }
}
