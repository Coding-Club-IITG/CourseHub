import 'package:hive/hive.dart';

import '../../models/contribution.dart';
import '../../models/favourites.dart';
import '../../models/user.dart';

class HiveStore {
  static Map<dynamic, dynamic> userData = {};
  static List<dynamic> contribution = [];
  static Map<dynamic, dynamic> coursesData = {};

  static User getUserDetails() {
    return User.fromJson(userData);
  }

  static List<Favourite> getFavourites() {
    final userFav = userData['favourites'] as List<dynamic>;
    return userFav.map((e) => Favourite.fromJson(e)).toList();
  }

  static List<Contribution> getContribution() {
    return contribution.map((e) => Contribution.fromJson(e)).toList();
  }

  static clearHiveData() {
    userData = {};
    contribution = [];
    coursesData = {};
  }
}

Future<void> setHiveStore() async {
  final box = await Hive.openBox('coursehub-data');
  HiveStore.userData = box.get('user') ?? {};
  HiveStore.contribution = box.get('contribution') ?? [];
  HiveStore.coursesData = box.get('courses-data') ?? {};
}

