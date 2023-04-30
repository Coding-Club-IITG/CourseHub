import 'dart:convert';

ExamDetails examDetailsFromJson(String str) =>
    ExamDetails.fromJson(json.decode(str));

String examDetailsToJson(ExamDetails data) => json.encode(data.toJson());

class ExamDetails {
  String id;
  String code;
  String room;
  DateTime date;
  String time;
  int nStudents;
  int from;
  int to;
  bool all;
  bool backloggers;
  bool found;

  ExamDetails({
    required this.id,
    required this.code,
    required this.room,
    required this.date,
    required this.time,
    required this.nStudents,
    required this.from,
    required this.to,
    required this.all,
    required this.backloggers,
    required this.found,
  });

  factory ExamDetails.fromJson(Map<dynamic, dynamic> json) => ExamDetails(
        id: json["_id"],
        code: json["code"],
        room: json["room"],
        date: DateTime.parse(json["date"]),
        time: json["time"],
        nStudents: json["nStudents"],
        from: json["from"],
        to: json["to"],
        all: json["all"],
        backloggers: json["backloggers"],
        found: json["found"],
      );

  Map<dynamic, dynamic> toJson() => {
        "_id": id,
        "code": code,
        "room": room,
        "date": date.toIso8601String(),
        "time": time,
        "nStudents": nStudents,
        "from": from,
        "to": to,
        "all": all,
        "backloggers": backloggers,
        "found": found,
      };
}
