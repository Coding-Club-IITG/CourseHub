import '../../apis/user/user.dart';
import '../../apis/files/downloader.dart';
import '../../database/hive_store.dart';
import '../../models/favourites.dart';
import '../../utilities/dynamic_links.dart';
import '../../utilities/file_size.dart';
import '../../utilities/letter_capitalizer.dart';
import '../../widgets/common/custom_linear_progress.dart';
import '../../widgets/common/custom_snackbar.dart';
import '../../widgets/common/splash_on_pressed.dart';

import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:like_button/like_button.dart';
import 'package:share_plus/share_plus.dart';

class FolderExplorer extends StatefulWidget {
  final Map<dynamic, dynamic> data;
  final Function(String) callback;

  const FolderExplorer({super.key, required this.data, required this.callback});

  @override
  State<FolderExplorer> createState() => _FolderExplorerState();
}

class _FolderExplorerState extends State<FolderExplorer> {
  final _isLoading = false;

  final user = HiveStore.getUserDetails();

  @override
  Widget build(BuildContext context) {
    if (widget.data["childType"] == "Folder") {
      List<Widget> folders = [];
      for (var e in widget.data["children"]) {
        folders.add(
          SplashOnPressed(
            onPressed: () {
              widget.callback(e["name"]);
            },
            splashColor: Colors.grey,
            child: Padding(
              padding: const EdgeInsets.all(10.0),
              child: Stack(
                children: [
                  SvgPicture.asset(
                    "assets/folder_card.svg",
                    width: double.infinity,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16.0, 20.0, 20, 0),
                    child: Text(
                      e["name"],
                      overflow: TextOverflow.ellipsis,
                      maxLines: 3,
                      style: const TextStyle(
                        fontSize: 18.0,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  Align(
                    alignment: const Alignment(0.7, 0.9),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 0, 1, 10),
                      child: Text(
                        widget.data["course"].toString().toUpperCase(),
                        style: const TextStyle(
                          fontSize: 14.0,
                          fontWeight: FontWeight.w700,
                          color: Color.fromRGBO(0, 0, 0, 0.30),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
        child: AnimationLimiter(
          child: GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 0.0,
            mainAxisSpacing: 0.0,
            childAspectRatio: 1.25,
            shrinkWrap: true,
            children: List.generate(
              folders.length,
              (int index) {
                return AnimationConfiguration.staggeredGrid(
                  columnCount: 2,
                  position: index,
                  duration: const Duration(milliseconds: 375),
                  child: ScaleAnimation(
                    scale: 0.5,
                    child: FadeInAnimation(
                      child: folders[index],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );
    } else {
      String path = widget.data["path"];
      String code = widget.data["course"];
      return Stack(
        children: [
          widget.data["children"].length == 0
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Nothing in Here!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.w400,
                        color: Color.fromRGBO(108, 108, 108, 1),
                        fontSize: 14.0,
                      ),
                    ),
                    const SizedBox(
                      height: 20,
                    ),
                    Image.asset(
                      'assets/my_profile_no_contri.png',
                      width: 150,
                    ),
                  ],
                )
              : AnimationLimiter(
                  child: ListView.builder(
                    itemCount: widget.data["children"].length,
                    itemBuilder: (BuildContext context, int index) {
                      String name = widget.data["children"][index]["name"];

                      bool isFavourite =
                          HiveStore.getUserDetails().favourites.any(
                                (element) => element.name == name,
                              );
                      return AnimationConfiguration.staggeredList(
                        position: index,
                        duration: const Duration(milliseconds: 375),
                        child: SlideAnimation(
                          verticalOffset: 50.0,
                          child: FadeInAnimation(
                            child: FutureBuilder(
                                future: isFileDownloaded(name),
                                builder: (context, snapshot) {
                                  if (snapshot.hasData) {
                                    bool isDownloaded = snapshot.data ?? false;
                                    return Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: () async {
                                          await downloadOpenFiles(
                                              isDownloaded,
                                              widget.data["children"][index]
                                                  ["name"],
                                              widget.data["children"][index]
                                                  ["id"],
                                              context);
                                          if (!isDownloaded) {
                                            setState(() {
                                              isDownloaded = true;
                                            });
                                          }
                                        },
                                        splashColor: Colors.grey,
                                        child: Container(
                                          margin: const EdgeInsets.symmetric(
                                              vertical: 12.0),
                                          child: Row(
                                            children: [
                                              const SizedBox(
                                                width: 12.0,
                                              ),
                                              Container(
                                                width: 60.0,
                                                height: 60.0,
                                                decoration: BoxDecoration(
                                                  border: Border.all(
                                                      color:
                                                          const Color.fromRGBO(
                                                        141,
                                                        141,
                                                        141,
                                                        1,
                                                      ),
                                                      width: 0.7),
                                                ),
                                                child: Image.network(
                                                  widget.data["children"][index]
                                                      ["thumbnail"],
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (context, error,
                                                      stackTrace) {
                                                    return const Icon(
                                                      Icons
                                                          .filter_b_and_w_sharp,
                                                      color: Color.fromRGBO(
                                                          0, 0, 0, 0.75),
                                                    );
                                                  },
                                                ),
                                              ),
                                              const SizedBox(
                                                width: 12.0,
                                              ),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  mainAxisAlignment:
                                                      MainAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      letterCapitalizer(name),
                                                      style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.w400,
                                                        fontSize: 15.0,
                                                        color: Colors.black,
                                                      ),
                                                    ),
                                                    const SizedBox(
                                                      height: 4,
                                                    ),
                                                    Text(
                                                      '${name.split('.').last.toUpperCase()} • ${fileSize(widget.data["children"][index]["size"])}',
                                                      style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.w300,
                                                        fontSize: 13.0,
                                                        color: Color.fromRGBO(
                                                            88, 88, 88, 1),
                                                      ),
                                                    ),
                                                    Text(
                                                      (user.semester < 3 ||
                                                              code[0].toLowerCase() ==
                                                                  'e')
                                                          ? 'Cepstrum'
                                                          : "Anonymous",
                                                      style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.w300,
                                                        fontSize: 13.0,
                                                        color: Color.fromRGBO(
                                                            88, 88, 88, 1),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const SizedBox(
                                                width: 10,
                                              ),
                                              Visibility(
                                                visible: isDownloaded,
                                                child: Container(
                                                  transform:
                                                      Matrix4.translationValues(
                                                          0, 2, 0),
                                                  child: const Icon(
                                                    Icons.check_circle_rounded,
                                                    color: Colors.green,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                width: 20,
                                              ),
                                              GestureDetector(
                                                onTap: () async {
                                                  try {
                                                    String address =
                                                        widget.data['_id'];
                                                    final shareLink =
                                                        await FirebaseDynamicLink
                                                            .createDynamicLink(
                                                      name.toLowerCase(),
                                                      widget.data['path'],
                                                      address,
                                                    );

                                                    await Share.share(shareLink,
                                                        subject:
                                                            '$name \n CourseHub');
                                                  } catch (e) {
                                                    if (!context.mounted) {
                                                      rethrow;
                                                    }
                                                    showSnackBar(
                                                        'Something went Wrong!',
                                                        context);
                                                  }
                                                },
                                                child: const Icon(
                                                  Icons.share,
                                                  color: Color.fromRGBO(
                                                      0, 0, 0, 0.75),
                                                  size: 24,
                                                ),
                                              ),
                                              const SizedBox(
                                                width: 10,
                                              ),
                                              LikeButton(
                                                isLiked: isFavourite,
                                                onTap: (isLiked) async {
                                                  if (!isFavourite) {
                                                    try {
                                                      isFavourite =
                                                          !isFavourite;
                                                      setState(() {});
                                                      await addFavourites(
                                                        name,
                                                        widget.data["children"]
                                                            [index]["id"],
                                                        path,
                                                        code,
                                                      );

                                                      return isFavourite;
                                                    } catch (e) {
                                                      if (!context.mounted) {
                                                        return null;
                                                      }
                                                      showSnackBar(
                                                          'Something went wrong!',
                                                          context);
                                                    }
                                                  } else {
                                                    try {
                                                      isFavourite =
                                                          !isFavourite;
                                                      Favourite fav = HiveStore
                                                              .getUserDetails()
                                                          .favourites
                                                          .firstWhere(
                                                            (element) =>
                                                                element.name ==
                                                                name,
                                                          );

                                                      await removeFavourites(
                                                        fav.id,
                                                      );

                                                      setState(() {});
                                                      return isFavourite;
                                                    } catch (e) {
                                                      if (!context.mounted) {
                                                        rethrow;
                                                      }
                                                      showSnackBar(
                                                          'Something went wrong!',
                                                          context);
                                                    }
                                                  }
                                                  return true;
                                                },
                                                likeBuilder: (isLiked) {
                                                  return isLiked
                                                      ? const Icon(
                                                          Icons.star,
                                                          size: 32,
                                                          color: Colors
                                                              .amberAccent,
                                                        )
                                                      : const Icon(
                                                          Icons
                                                              .star_border_outlined,
                                                          size: 24,
                                                          color: Color.fromRGBO(
                                                              0, 0, 0, 0.75),
                                                        );
                                                },
                                              ),
                                              const SizedBox(
                                                width: 15.0,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  } else {
                                    return Container();
                                  }
                                }),
                          ),
                        ),
                      );
                    },
                  ),
                ),
          Visibility(
            visible: _isLoading,
            child: const CustomLinearProgress(text: 'Loading ...'),
          ),
        ],
      );
    }
  }
}
