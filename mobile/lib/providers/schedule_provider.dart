import 'package:flutter/material.dart';

import '../database/cache_store.dart';

class DaysProvider extends ChangeNotifier {
  int currentDay = 0;
  final List<String> _days = CacheStore.daysOfTheWeek;
  List<String> get days => _days;

  void changeIndex(int a)
  {
    currentDay=a;
    notifyListeners();
  }

  String getDay()
  {
    String day=days[currentDay];
    return day.toUpperCase();
  }
}