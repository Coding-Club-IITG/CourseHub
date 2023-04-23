import 'dart:convert';

import 'package:coursehub/apis/protected.dart';
import 'package:coursehub/constants/endpoints.dart';
import 'package:coursehub/models/exam_details.dart';


import 'package:http/http.dart' as http;

Future<List<ExamDetails>> getExamDetails() async {
  final header = await getAccessToken();

  if (header == 'error') {
    throw 'token not found';
  }

  try {
    final res = await http.get(
      Uri.parse(MiscellaneousEndpoints.getTimetable),
      headers: {'Authorization': header},
    );

    final decodedResponse = json.decode(res.body)['data'] as List<dynamic>;

    List<ExamDetails> examTimings = [];

    for (var exam in decodedResponse) {
      if (exam['notFound'] != null && exam['notFound']) {
        continue;
      }

      examTimings.add(ExamDetails.fromJson(exam));
    }

    return examTimings;
  } catch (e) {
    rethrow;
  }
}
