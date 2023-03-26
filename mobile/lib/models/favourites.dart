import 'dart:convert';

Favourite favouriteFromJson(String str) => Favourite.fromJson(json.decode(str));

String favouriteToJson(Favourite data) => json.encode(data.toJson());

class Favourite {
  Favourite({
    required this.name,
    required this.favouriteId,
    required this.path,
    required this.code,
    required this.id,
  });

  String name;
  String favouriteId;
  String path;
  String code;
  String id;

  factory Favourite.fromJson(Map<dynamic, dynamic> json) => Favourite(
        name: json["name"],
        favouriteId: json["id"],
        path: json["path"],
        code: json["code"],
        id: json["_id"],
      );

  Map<dynamic, dynamic> toJson() => {
        "name": name,
        "id": favouriteId,
        "path": path,
        "code": code,
        "_id": id,
      };
}
