// To parse this JSON data, do
//
//     final user = userFromJson(jsonString);

import 'dart:convert';

import 'package:coursehub/models/course.dart';
import 'package:coursehub/models/favourites.dart';

User userFromJson(String str) => User.fromJson(json.decode(str));

String userToJson(User data) => json.encode(data.toJson());

class User {
  User({
    required this.id,
    required this.name,
    required this.email,
    required this.rollNumber,
    required this.semester,
    required this.degree,
    required this.courses,
    required this.department,
    required this.favourites,
    required this.v,
  });

  String id;
  String name;
  String email;
  int rollNumber;
  int semester;
  String degree;
  List<Course> courses;
  String department;
  List<dynamic> favourites;
  int v;

  factory User.fromJson(Map<dynamic, dynamic> json) => User(
        id: json["_id"],
        name: json["name"],
        email: json["email"],
        rollNumber: json["rollNumber"],
        semester: json["semester"],
        degree: json["degree"],
        courses:
            List<Course>.from(json["courses"].map((x) => Course.fromJson(x))),
        department: json["department"],
        favourites: List<Favourite>.from(
            json["favourites"].map((x) => Favourite.fromJson(x))),
        v: json["__v"],
      );

  Map<dynamic, dynamic> toJson() => {
        "_id": id,
        "name": name,
        "email": email,
        "rollNumber": rollNumber,
        "semester": semester,
        "degree": degree,
        "courses": List<dynamic>.from(courses.map((x) => x.toJson())),
        "department": department,
        "favourites": List<dynamic>.from(favourites.map((x) => x)),
        "__v": v,
      };
}
