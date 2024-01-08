import 'dart:convert';

import 'class_details.dart';
import 'course.dart';

Schedule scheduleFromJson(String str) =>
    Schedule.fromJson(json.decode(str));

String scheduleToJson(Schedule data) => json.encode(data.toJson());

class Schedule {
  String id;
  String day;
  Course course;
  DateTime datesCancelled;
  ClassDetails classesDetails;
  ClassDetails classesAdded;
  DateTime createdAt;
  DateTime updatedAt;

  Schedule({
    required this.id,
    required this.day,
    required this.course,
    required this.datesCancelled,
    required this.classesDetails,
    required this.classesAdded,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Schedule.fromJson(Map<dynamic, dynamic> json) => Schedule(
    id: json["id"],
    day: json["day"],
    course: Course.fromJson(json["course"]),
    datesCancelled: DateTime.parse(json["datesCancelled"]),
    classesDetails: ClassDetails.fromJson(json["classesDetails"]),
    classesAdded: ClassDetails.fromJson(json["classesAdded"]),
    createdAt: DateTime.parse(json["createdAt"]),
    updatedAt: DateTime.parse(json["updatedAt"]),
  );
  Map<dynamic, dynamic> toJson() {
    return {
      "id": id,
      "day": day,
      "course": course.toJson(),
      "datesCancelled": datesCancelled.toIso8601String(),
      "classesDetails": classesDetails.toJson(),
      "classesAdded": classesAdded.toJson(),
      "createdAt": createdAt.toIso8601String(),
      "updatedAt": updatedAt.toIso8601String(),
    };
  }
}
