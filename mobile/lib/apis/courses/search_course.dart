import 'dart:convert';

import 'package:http/http.dart' as http;
import '../../constants/endpoints.dart';

Future<dynamic> searchCourse(String coursename) async {
  final res = await http.post(
    Uri.parse(CoursesEndpoints.search),
    headers: {"Content-Type": "application/json"},
    body: jsonEncode(
      {
        "words": [coursename]
      },
    ),
  );

  final result = jsonDecode(res.body);

  return result;
}
