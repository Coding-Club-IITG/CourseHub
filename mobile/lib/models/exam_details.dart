import 'dart:convert';

ExamDetails examDetailsFromJson(String str) =>
    ExamDetails.fromJson(json.decode(str));

String examDetailsToJson(ExamDetails data) => json.encode(data.toJson());

class ExamDetails {
  ExamDetails({
    required this.id,
    required this.code,
    required this.room,
    required this.dateAndTime,
    required this.nStudents,
    required this.from,
    required this.to,
    required this.all,
    required this.backloggers,
    required this.v,
  });

  String id;
  String code;
  String room;
  String dateAndTime;
  int nStudents;
  int from;
  int to;
  bool all;
  bool backloggers;
  int v;

  factory ExamDetails.fromJson(Map<dynamic, dynamic> json) => ExamDetails(
        id: json["_id"],
        code: json["code"],
        room: json["room"],
        dateAndTime: json["dateAndTime"],
        nStudents: json["nStudents"],
        from: json["from"],
        to: json["to"],
        all: json["all"],
        backloggers: json["backloggers"],
        v: json["__v"],
      );

  Map<dynamic, dynamic> toJson() => {
        "_id": id,
        "code": code,
        "room": room,
        "dateAndTime": dateAndTime,
        "nStudents": nStudents,
        "from": from,
        "to": to,
        "all": all,
        "backloggers": backloggers,
        "__v": v,
      };
}
