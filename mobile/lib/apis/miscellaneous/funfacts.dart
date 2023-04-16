import 'dart:convert';
import 'dart:developer';

import 'package:coursehub/constants/endpoints.dart';
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;



Future<List<dynamic>> getFunFacts({bool fetchAgain = false}) async {
  try {
    final box = await Hive.openBox('coursehub-data');
    if (box.get('funFacts') != null && fetchAgain==false) {
      return box.get('funFacts') ?? [];
    } else {
      final res = await http.get(Uri.parse(MiscellaneousEndpoints.funFacts));
      final facts = jsonDecode(res.body)['data'];
      box.put('funFacts', facts);

    log('FETCHED AGAIN');
      return facts;
    }
  } catch (e) {

    rethrow;
  }
}
