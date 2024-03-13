import 'dart:io';

import 'package:coursehub/apis/schedule/schedule.dart';

import '../database/cache_store.dart';
import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int currentPageNumber = 0;
  List<File> selectedFiles = [];

  final GlobalKey<ScaffoldState> key = GlobalKey();

  // late AnimationController controller;

  Future<void> changePageNumber(int a)  async {
    if (a != 1) {
      CacheStore.isTempCourse = false;
    }
    clearFiles();

    if (CacheStore.isTempCourse && currentPageNumber == 1) {
      CacheStore.resetBrowsePath();
      CacheStore.isTempCourse = false;
    }

    if(a==3)
    {
      getDays();
      await getSchedules();
    }
    currentPageNumber = a;
    notifyListeners();
  }

  void addFiles(List<File> files) {
    selectedFiles += [...files];
    notifyListeners();
  }

  void clearFiles() {
    selectedFiles = [];
    notifyListeners();
  }
}
