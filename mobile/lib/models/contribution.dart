// To parse this JSON data, do
//
//     final contribution = contributionFromJson(jsonString);

import 'dart:convert';

Contribution contributionFromJson(String str) =>
    Contribution.fromJson(json.decode(str));

String contributionToJson(Contribution data) => json.encode(data.toJson());

class Contribution {
  Contribution({
    required this.id,
    required this.contributionId,
    required this.fileName,
    required this.approved,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.v,
    required this.courseCode,
    required this.description,
    required this.folder,
    required this.uploadedBy,
    required this.year,
  });

  String id;
  String contributionId;
  List<String> fileName;
  bool approved;
  bool isAnonymous;
  DateTime createdAt;
  DateTime updatedAt;
  int v;
  String courseCode;
  String description;
  String folder;
  String uploadedBy;
  String year;

  factory Contribution.fromJson(Map<dynamic, dynamic> json) => Contribution(
        id: json["_id"],
        contributionId: json["contributionId"],
        fileName: List<String>.from(json["fileName"].map((x) => x)),
        approved: json["approved"],
        isAnonymous: json["isAnonymous"],
        createdAt: DateTime.parse(json["createdAt"]),
        updatedAt: DateTime.parse(json["updatedAt"]),
        v: json["__v"],
        courseCode: json["courseCode"],
        description: json["description"],
        folder: json["folder"],
        uploadedBy: json["uploadedBy"],
        year: json["year"],
      );

  Map<dynamic, dynamic> toJson() => {
        "_id": id,
        "contributionId": contributionId,
        "fileName": List<dynamic>.from(fileName.map((x) => x)),
        "approved": approved,
        "isAnonymous": isAnonymous,
        "createdAt": createdAt.toIso8601String(),
        "updatedAt": updatedAt.toIso8601String(),
        "__v": v,
        "courseCode": courseCode,
        "description": description,
        "folder": folder,
        "uploadedBy": uploadedBy,
        "year": year,
      };
}
