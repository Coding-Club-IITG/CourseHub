import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../apis/protected.dart';
import '../../constants/endpoints.dart';
import '../../database/cache_store.dart';
import '../../models/exam_details.dart';


Future<List<ExamDetails>> getExamDetails() async {
  var decodedResponse = [];

  final header = await getAccessToken();

  if (header == 'error') {
    throw 'token not found';
  }

  try {
    if (CacheStore.examTimings.isNotEmpty) {
      decodedResponse = CacheStore.examTimings;
    } else {
      final res = await http.get(
        Uri.parse(MiscellaneousEndpoints.getTimetable),
        headers: {'Authorization': header},
      );
      decodedResponse = json.decode(res.body)['data'] as List<dynamic>;
      CacheStore.examTimings = decodedResponse;
      final prefs = await SharedPreferences.getInstance();

      prefs.setString("examDate", json.decode(res.body)['date']);
      prefs.setString("examType", json.decode(res.body)['exam']);
    }


    List<ExamDetails> examTimings = [];


    for (var exam in decodedResponse) {
      if (!exam['found']) {
        continue;
      }
      examTimings.add(ExamDetails.fromJson(exam));

    }

    examTimings.sort(
      (a, b) {
        return a.date.compareTo(b.date);
      },
    );

    return examTimings;
  } catch (e) {
    rethrow;
  }
}
