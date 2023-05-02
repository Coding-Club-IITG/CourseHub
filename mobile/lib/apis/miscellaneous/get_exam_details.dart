import 'dart:convert';

import 'package:coursehub/apis/protected.dart';
import 'package:coursehub/constants/endpoints.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/models/exam_details.dart';

import 'package:http/http.dart' as http;

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
    print(e);

    rethrow;
  }
}
