import 'package:flutter/material.dart';

class CacheStore {
  static Map<String, bool> courseAvailability = {};
  static Map<String, Color> courseColor = {};

  static clearCacheStore() {
    courseAvailability = {};
    courseColor = {};
  }
}
