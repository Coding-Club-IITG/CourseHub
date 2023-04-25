import 'package:flutter/material.dart';

import '../apis/courses/search_course.dart';
import '../models/search_result.dart';

class SearchProvider with ChangeNotifier {
  String text = 'Search by name or course code,\nPress Enter to Search';
  List<SearchResult> searchResult = [];
  bool? found;

  Future<void> search(value) async {
    text = 'Loading...';
    notifyListeners();

    try {
      final res = await searchCourse(value.toString().trim());

      found = res['found'];
      notifyListeners();

      List<dynamic> results = res['results'];
      if (found ?? false) {
        searchResult = results.map((e) => SearchResult.fromJson(e)).toList();
        notifyListeners();
      }

      text = 'Search by name or course code,\nPress Enter to Search';
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}
