import 'dart:convert';
import 'dart:math';

import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:http/http.dart' as http;

import '../../constants/endpoints.dart';

Future<bool> isCourseAvailable(String coursecode) async {
  if (CacheStore.courseAvailability[coursecode] != null) {
    return CacheStore.courseAvailability[coursecode] ?? false;
  }
  try {
    final res =
        await http.get(Uri.parse('${CoursesEndpoints.course}$coursecode'));

    final result = jsonDecode(res.body);

    if (result['found']) {
      CacheStore.courseAvailability[coursecode] = true;
      CacheStore.courseColor[coursecode] = colors[Random().nextInt(6)];
      return true;
    } else {
      CacheStore.courseAvailability[coursecode] = false;

      return false;
    }
  } catch (e) {
    rethrow;
  }
}
