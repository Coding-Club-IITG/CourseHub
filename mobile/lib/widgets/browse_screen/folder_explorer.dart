import 'dart:io';

import 'package:coursehub/apis/files/get_link.dart';
import 'package:coursehub/apis/user/user.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/utilities/downloader.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/utilities/file_size.dart';
import 'package:coursehub/utilities/letter_capitalizer.dart';
import 'package:coursehub/widgets/common/custom_linear_progress.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

import 'package:flutter_svg/flutter_svg.dart';
import 'package:open_filex/open_filex.dart';

import 'package:path_provider/path_provider.dart';

import '../../utilities/url_launcher.dart';

class FolderExplorer extends StatefulWidget {
  final Map<dynamic, dynamic> data;
  final Function(String) callback;

  const FolderExplorer({super.key, required this.data, required this.callback});

  @override
  State<FolderExplorer> createState() => _FolderExplorerState();
}

class _FolderExplorerState extends State<FolderExplorer> {
  bool _isLoading = false;
  bool _isDownloading = false;

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
              padding: const EdgeInsets.all(16.0),
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
                    alignment: const Alignment(0.7,0.9),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 0, 1, 10),
                      child: Text(
                        widget.data["course"].toString().toUpperCase(),
                        style: const TextStyle(
                          fontSize: 14.0,
                          fontWeight: FontWeight.w700,
                          color: Colors.black54,
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
        padding: const EdgeInsets.all(8.0),
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
                      'Nothing in Here !',
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
                                          if (isDownloaded) {
                                            try {
                                              final tempDirectory =
                                                  await getApplicationDocumentsDirectory();
                                              OpenFilex.open(
                                                  '${tempDirectory.path}/$name');
                                            } catch (e) {
                                              showSnackBar(
                                                  'Somwthing went wrong!',
                                                  context);
                                            }
                                          } else {
                                            try {
                                              setState(() {
                                                _isLoading = true;
                                              });
                                              final link = await getPreviewLink(
                                                  widget.data["children"][index]
                                                      ["id"]);

                                              setState(() {
                                                _isLoading = false;
                                              });
                                              await launchUrl(link);
                                            } catch (e) {
                                              setState(() {
                                                _isLoading = false;
                                              });
                                              showSnackBar(
                                                  'Something Went Wrong !',
                                                  context);
                                            }
                                          }
                                        },
                                        splashColor: Colors.grey,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 16.0),
                                          child: Row(
                                            children: [
                                              const SizedBox(
                                                width: 12.0,
                                              ),
                                              Container(
                                                width: 48.0,
                                                height: 48.0,
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
                                                  children: [
                                                    Text(
                                                      letterCapitalizer(name),
                                                      overflow:
                                                          TextOverflow.ellipsis,
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
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontFamily:
                                                            "ProximaNova",
                                                        fontWeight:
                                                            FontWeight.w400,
                                                        fontSize: 12.0,
                                                        color:
                                                            Color(0xFF585858),
                                                      ),
                                                    ),
                                                    const Text(
                                                      "Anonymous",
                                                      style: TextStyle(
                                                        fontFamily:
                                                            "ProximaNova",
                                                        fontWeight:
                                                            FontWeight.w400,
                                                        fontSize: 12.0,
                                                        color:
                                                            Color(0xFF585858),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const SizedBox(
                                                width: 20,
                                              ),
                                              GestureDetector(
                                                onTap: () async {
                                                  if (isDownloaded) {
                                                    showSnackBar(
                                                        'File Already Downloaded!',
                                                        context);
                                                    return;
                                                  }
                                                  if (_isDownloading) {
                                                    showSnackBar(
                                                        'Wait for the current download to get finished!',
                                                        context);
                                                    return;
                                                  }
                                                  try {
                                                    setState(() {
                                                      _isLoading = true;
                                                    });
                                                    final link =
                                                        await getDownloadLink(
                                                            widget.data[
                                                                    "children"]
                                                                [index]["id"]);

                                                    setState(() {
                                                      _isLoading = false;
                                                    });

                                                    setState(() {
                                                      _isDownloading = true;
                                                    });
                                                    final fileName =
                                                        widget.data["children"]
                                                            [index]["name"];

                                                    final filedata =
                                                        await downloader(
                                                      link,
                                                    );

                                                    final tempDirectory =
                                                        await getApplicationDocumentsDirectory();
                                                    File file = File(
                                                        '${tempDirectory.path}/$fileName');
                                                    final raf = file.openSync(
                                                        mode: FileMode.write);
                                                    raf.writeFromSync(filedata);
                                                    await raf.close();

                                                    await OpenFilex.open(
                                                        file.path);
                                                    setState(() {
                                                      _isDownloading = false;
                                                    });
                                                  } catch (e) {
                                                    showSnackBar(
                                                        'Something Went Wrong !',
                                                        context);
                                                  }
                                                },
                                                child: isDownloaded
                                                    ? const Icon(
                                                        Icons.check_circle,
                                                        color: Colors.green,
                                                      )
                                                    : const Icon(
                                                        Icons
                                                            .download_for_offline_outlined,
                                                        size: 30.0,
                                                        color: Color.fromRGBO(
                                                            0, 0, 0, 0.75),
                                                      ),
                                              ),
                                              const SizedBox(
                                                width: 10,
                                              ),
                                              GestureDetector(
                                                onTap: () async {
                                                  if (!isFavourite) {
                                                    try {
                                                      await addFavourites(
                                                        name,
                                                        widget.data["children"]
                                                            [index]["id"],
                                                        path,
                                                        code,
                                                      );

                                                      setState(() {});
                                                      return;
                                                    } catch (e) {
                                                      showSnackBar(
                                                          'Something went wrong !',
                                                          context);
                                                      return;
                                                    }
                                                  } else {
                                                    try {
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
                                                      return;
                                                    } catch (e) {
                                                      showSnackBar(
                                                          'Something went wrong !',
                                                          context);
                                                      return;
                                                    }
                                                  }
                                                },
                                                child: !isFavourite
                                                    ? const Icon(
                                                        Icons
                                                            .star_border_outlined,
                                                        color: Color.fromRGBO(
                                                            0, 0, 0, 0.75),
                                                        size: 30,
                                                      )
                                                    : const Icon(
                                                        Icons
                                                            .star_purple500_sharp,
                                                        color: Themes.kYellow,
                                                        size: 30,
                                                      ),
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
          Visibility(
            visible: _isDownloading,
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: const Color.fromRGBO(255, 255, 255, 0.9),
            ),
          )
        ],
      );
    }
  }
}
