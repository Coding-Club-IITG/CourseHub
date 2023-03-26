// To parse this JSON data, do
//
//     final searchResult = searchResultFromJson(jsonString);

import 'dart:convert';

SearchResult searchResultFromJson(String str) =>
    SearchResult.fromJson(json.decode(str));

String searchResultToJson(SearchResult data) => json.encode(data.toJson());

class SearchResult {
  SearchResult({
    required this.id,
    required this.isAvailable,
    required this.name,
    required this.code,
    required this.numberOfWordsMatched,
    required this.codeMatch,
  });

  String id;
  bool isAvailable;
  String name;
  String code;
  int numberOfWordsMatched;
  int codeMatch;

  factory SearchResult.fromJson(Map<dynamic, dynamic> json) => SearchResult(
        id: json["_id"],
        isAvailable: json["isAvailable"],
        name: json["name"],
        code: json["code"],
        numberOfWordsMatched: json["numberOfWordsMatched"],
        codeMatch: json["codeMatch"],
      );

  Map<dynamic, dynamic> toJson() => {
        "_id": id,
        "isAvailable": isAvailable,
        "name": name,
        "code": code,
        "numberOfWordsMatched": numberOfWordsMatched,
        "codeMatch": codeMatch,
      };
}
