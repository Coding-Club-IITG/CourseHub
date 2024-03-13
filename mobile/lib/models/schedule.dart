import 'dart:convert';

Schedule scheduleFromJson(String str) =>
    Schedule.fromJson(json.decode(str));

String examDetailsToJson(Schedule data) => json.encode(data.toJson());

class Schedule {
  String subject;
  String room;
  DateTime from;
  DateTime to;

  Schedule({
    required this.subject,
    required this.room,
    required this.from,
    required this.to,
  });

  factory Schedule.fromJson(Map<dynamic, dynamic> json) => Schedule(
    subject: json["userCourse"]["name"],
    room: json["classDetails"]["location"],
    from: DateTime.parse(json["classDetails"]["startDateTime"]),
    to: DateTime.parse(json["classDetails"]["endDateTime"]),
  );

  Map<dynamic, dynamic> toJson() => {
    "subject": subject,
    "from": from.toIso8601String(),
    "to": to.toIso8601String(),
    "room": room,
  };
}
