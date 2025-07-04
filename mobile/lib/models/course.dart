// To parse this JSON data, do
//
//     final course = courseFromJson(jsonString);

import 'dart:convert';

Course courseFromJson(String str) => Course.fromJson(json.decode(str));

String courseToJson(Course data) => json.encode(data.toJson());

class Course {
  Course({
    required this.code,
    required this.name,
    required this.color,
  });

  String code;
  String name;
  String? color;

  factory Course.fromJson(Map<dynamic, dynamic> json) => Course(
        code: json["code"],
        name: json["name"],
        color: json["color"],
      );

  Map<String, dynamic> toJson() => {
        "code": code,
        "name": name,
        "color": color,
      };
}
