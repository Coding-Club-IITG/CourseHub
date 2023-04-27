import 'dart:convert';

import 'package:coursehub/constants/endpoints.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;

Future<List<dynamic>> getFunFacts({bool fetchAgain = false}) async {
  final box = await Hive.openBox('coursehub-data');
  try {
    if (box.get('funFacts') != null && fetchAgain == false) {
      return box.get('funFacts') ?? [];
    } else {
      final res = await http.get(Uri.parse(MiscellaneousEndpoints.funFacts));
      final facts = jsonDecode(res.body)['data'];

      box.put('funFacts', facts);

      return facts;
    }
  } catch (e) {
    const facts = ['CourseHub is Awesome!'];

    box.put('funFacts', facts);

    return facts;
  }
}
