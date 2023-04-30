import 'dart:convert';
import 'dart:developer';

import 'package:coursehub/apis/protected.dart';
import 'package:coursehub/constants/endpoints.dart';
import 'package:coursehub/models/exam_details.dart';
import 'package:hive/hive.dart';

import 'package:http/http.dart' as http;

Future<List<ExamDetails>> getExamDetails({bool fetchAgain = false}) async {
  final box = await Hive.openBox('coursehub-data');

  var decodedResponse = [];

  final data = box.get('exam-data');

  if (data == null || fetchAgain) {
    final header = await getAccessToken();

    if (header == 'error') {
      throw 'token not found';
    }


    try {
      final res = await http.get(
        Uri.parse(MiscellaneousEndpoints.getTimetable),
        headers: {'Authorization': header},
      );
      box.put('exam-data', res.body);
      log(res.toString());

      decodedResponse = json.decode(res.body)['data'] as List<dynamic>;
    } catch (e) {
      log(e.toString());
      rethrow;
    }
  } else {
    decodedResponse = json.decode(data)['data'] as List<dynamic>;
  }

  List<ExamDetails> examTimings = [];

  for (var exam in decodedResponse) {
    if (!exam['found']) {
      continue;
    }

    examTimings.add(ExamDetails.fromJson(exam));
  }

  examTimings.sort((a, b) {
    return a.date.compareTo(b.date);
  });
  return examTimings;
}
