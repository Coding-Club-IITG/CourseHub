import 'package:coursehub/database/cache_store.dart';
import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int currentPageNumber = 0;
  final GlobalKey<ScaffoldState> key = GlobalKey(); 

  
  // late AnimationController controller;

  void changePageNumber(int a) {
    if (a != 1) {
      CacheStore.isTempCourse = false;
    }

    // if (currentPageNumber == 2) {
    //   controller.reverse(from: 0.75);
    // }
    currentPageNumber = a;
    notifyListeners();
  }
}
