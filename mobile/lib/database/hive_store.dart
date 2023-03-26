import 'package:coursehub/models/contribution.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/models/user.dart';

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
