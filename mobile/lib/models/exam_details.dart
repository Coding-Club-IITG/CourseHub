import 'dart:convert';

ExamDetails examDetailsFromJson(String str) =>
    ExamDetails.fromJson(json.decode(str));

String examDetailsToJson(ExamDetails data) => json.encode(data.toJson());

class ExamDetails {
  String code;
  String room;
  DateTime date;
  String time;
  int nStudents;
  int from;
  int to;
  bool all;
  bool backloggers;
  String name;

  ExamDetails({
    required this.code,
    required this.room,
    required this.date,
    required this.time,
    required this.nStudents,
    required this.from,
    required this.to,
    required this.all,
    required this.backloggers,
    required this.name,
  });

  factory ExamDetails.fromJson(Map<dynamic, dynamic> json) => ExamDetails(
        code: json["code"],
        room: json["room"],
        date: DateTime.parse(json["date"]),
        time: json["time"],
        nStudents: json["nStudents"],
        from: json["from"],
        to: json["to"],
        all: json["all"],
        backloggers: json["backloggers"],
        name: json["name"],
      );

  Map<dynamic, dynamic> toJson() => {
        "code": code,
        "room": room,
        "date": date.toIso8601String(),
        "time": time,
        "nStudents": nStudents,
        "from": from,
        "to": to,
        "all": all,
        "backloggers": backloggers,
        "name": name,
      };
}
