
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

  Map<dynamic, dynamic> toJson() => {
        "code": code,
        "name": name,
        "color": color,
      };
}
